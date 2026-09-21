import { WorkerClass } from './constants.mjs';

const defaultRank = Object.freeze({
  [WorkerClass.ECONOMY]: 10,
  [WorkerClass.STRONG]: 20,
  [WorkerClass.ROOT]: 30,
});

export function resolveWorker({ requestedClass, availableWorkers, costRank = defaultRank }) {
  if (!Object.values(WorkerClass).includes(requestedClass)) {
    throw new TypeError(`Unknown requested worker class: ${requestedClass}`);
  }
  if (!Array.isArray(availableWorkers) || availableWorkers.length === 0) {
    throw new Error('No available workers were provided');
  }

  const candidates = availableWorkers
    .filter((worker) => worker && worker.enabled !== false)
    .filter((worker) => Array.isArray(worker.classes) && worker.classes.includes(requestedClass))
    .filter((worker) => worker.certified !== false)
    .sort((a, b) => {
      const aCost = Number.isFinite(a.expectedCost) ? a.expectedCost : (costRank[requestedClass] ?? 9999);
      const bCost = Number.isFinite(b.expectedCost) ? b.expectedCost : (costRank[requestedClass] ?? 9999);
      return aCost - bCost || String(a.id).localeCompare(String(b.id));
    });

  if (candidates.length === 0) {
    const error = new Error(`No certified worker supports ${requestedClass}`);
    error.code = 'ADAPTER_UNAVAILABLE';
    throw error;
  }
  return candidates[0];
}

export function assertNoSilentSubstitution(requestedClass, actualClass) {
  if (requestedClass !== actualClass) {
    const error = new Error(`Worker class substitution requires explicit reroute: requested=${requestedClass} actual=${actualClass}`);
    error.code = 'WORKER_CLASS_SUBSTITUTION';
    throw error;
  }
}
