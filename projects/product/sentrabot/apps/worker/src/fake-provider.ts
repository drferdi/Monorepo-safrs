import type {
  ExecutionRequest,
  ExecutionRuntime,
} from "./execution-contract.ts";

export function createFakeProviderRuntime(): ExecutionRuntime {
  return {
    async run(request: ExecutionRequest) {
      return `[fake:${request.model}] ${request.prompt}`;
    },
  };
}
