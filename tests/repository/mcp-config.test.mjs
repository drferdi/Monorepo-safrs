import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import test from "node:test";

test("Cursor MCP excludes filesystem access and limits browser origins", () => {
  const mcp = JSON.parse(readFileSync(".cursor/mcp.json", "utf8"));

  assert.equal(Object.hasOwn(mcp.mcpServers, "filesystem"), false);
  assert.deepEqual(mcp.mcpServers.playwright.args.slice(-2), [
    "--allowed-origins",
    "http://localhost:*;http://127.0.0.1:*",
  ]);
});
