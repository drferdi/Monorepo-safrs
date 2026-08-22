import { readRepoJson } from "./root.ts";

export type RegistryDocument = {
  id: string;
  path: string;
  type: string;
  status: string;
  normativity: string;
  read_order?: number | undefined;
  scope: string;
};

export type KnowledgeSnapshot = {
  available: boolean;
  documents: RegistryDocument[];
};

/** read_order ascending; documents without one come after, ordered by path. */
export function sortDocuments(
  documents: RegistryDocument[],
): RegistryDocument[] {
  return [...documents].sort((a, b) => {
    const orderA = a.read_order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.read_order ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.path.localeCompare(b.path);
  });
}

/** The document registry the routing block is generated from — the authority. */
export async function readDocumentRegistry(): Promise<KnowledgeSnapshot> {
  try {
    const registry = await readRepoJson<{ documents?: RegistryDocument[] }>(
      ".safrs/document-registry.json",
    );
    if (!registry?.documents) {
      return { available: false, documents: [] };
    }
    return { available: true, documents: sortDocuments(registry.documents) };
  } catch {
    return { available: false, documents: [] };
  }
}
