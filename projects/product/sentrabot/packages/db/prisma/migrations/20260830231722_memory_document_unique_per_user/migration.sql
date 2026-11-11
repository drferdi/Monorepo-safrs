-- Personal ("user" scope) memory was only unique per (workspaceId, scope, botId, path), not per
-- user, even though every read/search/commit already scopes by userId. Two different users
-- committing personal memory at the same path in the same workspace collided on this constraint.
DROP INDEX "memory_documents_workspaceId_scope_botId_path_key";

CREATE UNIQUE INDEX "memory_documents_workspaceId_userId_scope_botId_path_key"
  ON "memory_documents" ("workspaceId", "userId", scope, "botId", path);
