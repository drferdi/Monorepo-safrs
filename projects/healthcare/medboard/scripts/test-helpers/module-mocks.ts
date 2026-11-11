// Drferdi — vision, brought to life.
import Module from 'node:module'

export type ModuleMockMap = Record<string, unknown>

const nodeModule = Module as typeof Module & {
  _load: (request: string, parent: NodeModule | null, isMain: boolean) => unknown
}

export function installModuleMocks(mocks: ModuleMockMap): () => void {
  const originalLoad = nodeModule._load

  nodeModule._load = function patchedLoad(
    request: string,
    parent: NodeModule | null,
    isMain: boolean
  ) {
    if (request in mocks) {
      return mocks[request]
    }
    return originalLoad.call(this, request, parent, isMain)
  }

  return () => {
    nodeModule._load = originalLoad
  }
}
