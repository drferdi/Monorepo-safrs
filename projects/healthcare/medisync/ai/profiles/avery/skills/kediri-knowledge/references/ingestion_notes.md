# Ingestion Notes

Recommended pipeline:
1. Validate each JSONL record against `schema.json`.
2. Store canonical records in a relational/document store.
3. Generate embeddings only from `name + facts + local_context`, not from raw source dumps.
4. Keep source URLs and temporal metadata outside embedding text but linked to the record.
5. Retrieval filter order: `scope` -> `temporal_class` -> semantic match.
6. For current questions, prefer Living Registry/Pulse with newest verified timestamp.
7. For historical questions, prefer Deep Memory; surface uncertainty when interpretations differ.
8. For local conversation, allow `local_context` to shape phrasing, but never let it override verified facts.
