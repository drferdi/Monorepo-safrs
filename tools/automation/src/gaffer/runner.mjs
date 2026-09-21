import { FailureClass, Route, TaskState, WorkerClass } from './constants.mjs';
import { selectExecutionRoute, classifyWorker } from './classifier.mjs';
import { createTaskGraph, refreshTaskReadiness, readyTasks, allVerified } from './scheduler.mjs';
import { resolveWorker, assertNoSilentSubstitution } from './router.mjs';
import { escalationDecision } from './escalation.mjs';
import { assertChangedFilesWithinScope } from './scope.mjs';
import { createTelemetry } from './telemetry.mjs';
import { validateWorkerResult } from './contracts.mjs';

function requiredFunction(ports, name) {
  if (typeof ports?.[name] !== 'function') throw new TypeError(`Gaffer port '${name}' must be a function`);
  return ports[name];
}

function errorToFailureClass(error) {
  if (error?.code && Object.values(FailureClass).includes(error.code)) return error.code;
  if (error?.code === 'ADAPTER_UNAVAILABLE') return FailureClass.ADAPTER_UNAVAILABLE;
  return FailureClass.TEST_FAILURE;
}

function updateTask(tasks, id, patch) {
  const current = tasks.get(id);
  if (!current) throw new Error(`Unknown task ${id}`);
  tasks.set(id, { ...current, ...patch });
}

/**
 * Provider-neutral Gaffer runtime.
 * SAFRS and provider-specific behavior is injected through ports so this module
 * never guesses exports from existing repository modules.
 */
export async function runGaffer({ intent, context = {}, policy = {}, ports, telemetry: suppliedTelemetry = null }) {
  if (typeof intent !== 'string' || intent.trim() === '') throw new TypeError('intent is required');

  const telemetry = suppliedTelemetry ?? createTelemetry();
  const discoverProject = requiredFunction(ports, 'discoverProject');
  const authorize = requiredFunction(ports, 'authorize');
  const rootPlan = requiredFunction(ports, 'rootPlan');
  const rootImplement = requiredFunction(ports, 'rootImplement');
  const executeWorker = requiredFunction(ports, 'executeWorker');
  const verify = requiredFunction(ports, 'verify');
  const rootAccept = requiredFunction(ports, 'rootAccept');
  const listAvailableWorkers = requiredFunction(ports, 'listAvailableWorkers');
  const audit = typeof ports.audit === 'function' ? ports.audit : null;

  const maxAttempts = Number.isInteger(policy.maxAttemptsPerTask) ? policy.maxAttemptsPerTask : 2;
  const maxWorkerCalls = Number.isInteger(policy.maxWorkerCalls) ? policy.maxWorkerCalls : 12;
  let workerCalls = 0;

  await telemetry.emit('gaffer.run.started', { intent });
  const project = await discoverProject({ intent, context });
  const authorization = await authorize({ intent, project, context });
  if (authorization?.allowed === false) {
    await telemetry.emit('gaffer.run.blocked', { reason: authorization.reason ?? 'SAFRS authorization denied' });
    return { status: 'BLOCKED', reason: authorization.reason ?? 'SAFRS authorization denied', telemetry: telemetry.events };
  }

  const plan = await rootPlan({ intent, project, authorization, context });
  const route = plan.route ?? selectExecutionRoute(plan.routeSignals ?? {});
  await telemetry.emit('gaffer.route.selected', { route, project: project?.id ?? project?.path ?? null });

  if (route === Route.SOLO) {
    const result = await rootImplement({ intent, project, plan, context });
    const verification = await verify({ mode: 'SOLO', intent, project, plan, result, authorization });
    if (!verification?.passed) {
      await telemetry.emit('gaffer.run.blocked', { reason: 'verification_failed' });
      return { status: 'BLOCKED', reason: 'verification_failed', verification, telemetry: telemetry.events };
    }
    const acceptance = await rootAccept({ intent, project, plan, verification, result });
    if (!acceptance?.accepted) {
      await telemetry.emit('gaffer.run.blocked', { reason: acceptance?.reason ?? 'root_rejected' });
      return { status: 'BLOCKED', reason: acceptance?.reason ?? 'root_rejected', telemetry: telemetry.events };
    }
    await telemetry.emit('gaffer.run.ready', { route });
    return { status: 'READY', route, project, verification, acceptance, telemetry: telemetry.events };
  }

  if (route !== Route.DECOMPOSE) throw new Error(`Unsupported route ${route}`);
  const graph = createTaskGraph(plan.tasks ?? []);
  let tasks = refreshTaskReadiness(graph);
  const attempts = new Map([...tasks.keys()].map((id) => [id, 0]));

  while (!allVerified(tasks)) {
    const ready = readyTasks(tasks);
    if (ready.length === 0) {
      const unresolved = [...tasks.values()].filter((t) => t.state !== TaskState.VERIFIED);
      return { status: 'BLOCKED', reason: 'no_ready_tasks', tasks: unresolved, telemetry: telemetry.events };
    }

    // v0.1 deliberately executes serially for deterministic safety.
    const task = ready[0];
    updateTask(tasks, task.id, { state: TaskState.RUNNING });
    await telemetry.emit('gaffer.task.ready', { taskId: task.id });

    const safrsTaskDecision = await authorize({ intent, project, task, context });
    if (safrsTaskDecision?.allowed === false) {
      updateTask(tasks, task.id, { state: TaskState.BLOCKED, failureClass: FailureClass.SECURITY_RISK });
      tasks = refreshTaskReadiness(tasks);
      continue;
    }

    let requestedClass = task.workerClass ?? classifyWorker(task, safrsTaskDecision);
    let taskComplete = false;

    while (!taskComplete) {
      if (workerCalls >= maxWorkerCalls) {
        updateTask(tasks, task.id, { state: TaskState.BLOCKED, failureClass: FailureClass.BUDGET_EXHAUSTED });
        await telemetry.emit('gaffer.run.blocked', { reason: FailureClass.BUDGET_EXHAUSTED, taskId: task.id });
        return { status: 'BLOCKED', reason: FailureClass.BUDGET_EXHAUSTED, tasks: [...tasks.values()], telemetry: telemetry.events };
      }

      attempts.set(task.id, attempts.get(task.id) + 1);
      const availableWorkers = await listAvailableWorkers({ requestedClass, task, project });
      let worker;
      try {
        worker = resolveWorker({ requestedClass, availableWorkers });
        assertNoSilentSubstitution(requestedClass, worker.class ?? requestedClass);
      } catch (error) {
        updateTask(tasks, task.id, { state: TaskState.BLOCKED, failureClass: FailureClass.ADAPTER_UNAVAILABLE });
        await telemetry.emit('gaffer.run.blocked', { reason: FailureClass.ADAPTER_UNAVAILABLE, taskId: task.id });
        return { status: 'BLOCKED', reason: FailureClass.ADAPTER_UNAVAILABLE, tasks: [...tasks.values()], telemetry: telemetry.events };
      }

      workerCalls += 1;
      await telemetry.emit('gaffer.worker.selected', { taskId: task.id, workerClass: requestedClass, workerId: worker.id });

      try {
        const workerResult = validateWorkerResult(await executeWorker({ worker, workerClass: requestedClass, task, project, context }));
        assertChangedFilesWithinScope(workerResult.changedFiles ?? [], task.ownedPaths ?? []);
        updateTask(tasks, task.id, { state: TaskState.VERIFYING, workerClass: requestedClass });
        const verification = await verify({ mode: 'TASK', intent, project, task, workerResult, authorization: safrsTaskDecision });

        if (!verification?.passed) {
          const failureClass = verification?.failureClass ?? FailureClass.TEST_FAILURE;
          const decision = escalationDecision({
            failureClass,
            currentClass: requestedClass,
            attempts: attempts.get(task.id),
            maxAttempts,
          });
          await telemetry.emit('gaffer.verification.completed', { taskId: task.id, passed: false, failureClass });

          if (decision.action === 'ESCALATE') {
            requestedClass = decision.workerClass;
            updateTask(tasks, task.id, { state: TaskState.READY, failureClass });
            await telemetry.emit('gaffer.escalation.triggered', { taskId: task.id, to: requestedClass, failureClass });
            continue;
          }
          if (decision.action === 'RETRY_SAME') {
            updateTask(tasks, task.id, { state: TaskState.READY, failureClass });
            continue;
          }
          updateTask(tasks, task.id, { state: TaskState.FAILED, failureClass });
          taskComplete = true;
          continue;
        }

        await telemetry.emit('gaffer.verification.completed', { taskId: task.id, passed: true });
        updateTask(tasks, task.id, { state: TaskState.VERIFIED, verification });
        await telemetry.emit('gaffer.task.verified', { taskId: task.id, workerClass: requestedClass });
        taskComplete = true;
      } catch (error) {
        const failureClass = errorToFailureClass(error);
        const decision = escalationDecision({
          failureClass,
          currentClass: requestedClass,
          attempts: attempts.get(task.id),
          maxAttempts,
        });
        if (decision.action === 'ESCALATE') {
          requestedClass = decision.workerClass;
          updateTask(tasks, task.id, { state: TaskState.READY, failureClass });
          await telemetry.emit('gaffer.escalation.triggered', { taskId: task.id, to: requestedClass, failureClass });
          continue;
        }
        if (decision.action === 'RETRY_SAME') {
          updateTask(tasks, task.id, { state: TaskState.READY, failureClass });
          continue;
        }
        updateTask(tasks, task.id, { state: TaskState.FAILED, failureClass, error: error.message });
        taskComplete = true;
      }
    }
    tasks = refreshTaskReadiness(tasks);
  }

  const finalVerification = await verify({ mode: 'FINAL', intent, project, plan, tasks: [...tasks.values()], authorization });
  if (!finalVerification?.passed) {
    return { status: 'BLOCKED', reason: 'final_verification_failed', tasks: [...tasks.values()], finalVerification, telemetry: telemetry.events };
  }

  if (authorization?.requiresAudit) {
    if (!audit) return { status: 'BLOCKED', reason: 'audit_required_but_unavailable', telemetry: telemetry.events };
    const auditResult = await audit({ intent, project, plan, tasks: [...tasks.values()], verification: finalVerification });
    await telemetry.emit('gaffer.audit.completed', { verdict: auditResult?.verdict ?? null });
    if (auditResult?.verdict !== 'SHIP') {
      return { status: 'BLOCKED', reason: `audit_${String(auditResult?.verdict ?? 'UNKNOWN').toLowerCase()}`, audit: auditResult, telemetry: telemetry.events };
    }
  }

  const acceptance = await rootAccept({ intent, project, plan, tasks: [...tasks.values()], verification: finalVerification });
  if (!acceptance?.accepted) return { status: 'BLOCKED', reason: acceptance?.reason ?? 'root_rejected', telemetry: telemetry.events };

  await telemetry.emit('gaffer.run.ready', { route });
  return { status: 'READY', route, project, tasks: [...tasks.values()], verification: finalVerification, acceptance, telemetry: telemetry.events };
}
