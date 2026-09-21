import { TaskState } from './constants.mjs';
import { normalizeTaskContract } from './contracts.mjs';

export function createTaskGraph(rawTasks) {
  if (!Array.isArray(rawTasks) || rawTasks.length === 0) throw new Error('Task graph requires at least one task');
  const tasks = new Map();

  for (const raw of rawTasks) {
    const task = normalizeTaskContract(raw);
    if (tasks.has(task.id)) throw new Error(`Duplicate task id: ${task.id}`);
    tasks.set(task.id, { ...task });
  }

  for (const task of tasks.values()) {
    for (const dep of task.dependencies) {
      if (!tasks.has(dep)) throw new Error(`Task ${task.id} depends on missing task ${dep}`);
      if (dep === task.id) throw new Error(`Task ${task.id} cannot depend on itself`);
    }
  }

  assertAcyclic(tasks);
  return tasks;
}

function assertAcyclic(tasks) {
  const indegree = new Map([...tasks.keys()].map((id) => [id, 0]));
  const children = new Map([...tasks.keys()].map((id) => [id, []]));
  for (const task of tasks.values()) {
    for (const dep of task.dependencies) {
      indegree.set(task.id, indegree.get(task.id) + 1);
      children.get(dep).push(task.id);
    }
  }
  const queue = [...indegree.entries()].filter(([, n]) => n === 0).map(([id]) => id).sort();
  let visited = 0;
  while (queue.length) {
    const id = queue.shift();
    visited += 1;
    for (const child of children.get(id)) {
      indegree.set(child, indegree.get(child) - 1);
      if (indegree.get(child) === 0) {
        queue.push(child);
        queue.sort();
      }
    }
  }
  if (visited !== tasks.size) throw new Error('Task graph contains a cycle');
}

export function refreshTaskReadiness(tasks) {
  const next = new Map([...tasks].map(([id, task]) => [id, { ...task }]));
  for (const task of next.values()) {
    if (![TaskState.PENDING, TaskState.BLOCKED].includes(task.state)) continue;
    const deps = task.dependencies.map((id) => next.get(id));
    if (deps.some((dep) => [TaskState.FAILED, TaskState.BLOCKED, TaskState.CANCELLED].includes(dep.state))) {
      task.state = TaskState.BLOCKED;
      continue;
    }
    if (deps.every((dep) => dep.state === TaskState.VERIFIED)) task.state = TaskState.READY;
  }
  for (const task of next.values()) {
    if (task.dependencies.length === 0 && task.state === TaskState.PENDING) task.state = TaskState.READY;
  }
  return next;
}

export function readyTasks(tasks) {
  return [...refreshTaskReadiness(tasks).values()]
    .filter((task) => task.state === TaskState.READY)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function allVerified(tasks) {
  return [...tasks.values()].every((task) => task.state === TaskState.VERIFIED);
}
