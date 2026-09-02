import { closeSync, mkdtempSync, openSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createExclusiveChildViaDirectoryFdWin32,
  directoryHandleFor,
  mkdirChildViaDirectoryFdWin32,
  openChildDirectoryViaDirectoryFdWin32,
  openExistingChildViaDirectoryFdWin32,
  pathFromHandle,
} from "./desktop-sandbox-win32-path.js";

const moduleSource = readFileSync(
  fileURLToPath(new URL("./desktop-sandbox-win32-path.ts", import.meta.url)),
  "utf8",
);

describe.skipIf(process.platform !== "win32")("win32 relative sandbox paths", () => {
  let root = "";
  let other = "";
  let rootFd = -1;

  beforeAll(() => {
    root = realpathSync.native(mkdtempSync(path.join(tmpdir(), "sentra-win32-root-")));
    other = realpathSync.native(mkdtempSync(path.join(tmpdir(), "sentra-win32-other-")));
    rootFd = openSync(root, 0);
  });

  afterAll(() => {
    if (rootFd >= 0) closeSync(rootFd);
    rmSync(root, { recursive: true, force: true });
    rmSync(other, { recursive: true, force: true });
  });

  it("opens a directory handle for the inode the descriptor pins", () => {
    expect(() => directoryHandleFor({ fd: rootFd, path: root })).not.toThrow();
  });

  it("fails closed when the path names a different directory than the descriptor", () => {
    expect(() => directoryHandleFor({ fd: rootFd, path: other })).toThrow(/escapes/);
  });

  it("creates, opens and mkdirs relative to a held parent", async () => {
    const parent = { fd: rootFd, path: root };

    const created = createExclusiveChildViaDirectoryFdWin32(parent, "note.txt");
    expect(pathFromHandle(created)).toBe(realpathSync.native(path.join(root, "note.txt")));
    await created.writeFile("hello");
    await created.close();

    const reopened = openExistingChildViaDirectoryFdWin32(parent, "note.txt");
    expect(pathFromHandle(reopened)).toBe(realpathSync.native(path.join(root, "note.txt")));
    expect((await reopened.stat()).isFile()).toBe(true);
    await reopened.close();

    const madePath = mkdirChildViaDirectoryFdWin32(parent, "nested");
    expect(madePath).toBe(realpathSync.native(path.join(root, "nested")));

    const dir = openChildDirectoryViaDirectoryFdWin32(parent, "nested");
    expect(pathFromHandle(dir)).toBe(realpathSync.native(path.join(root, "nested")));
    expect((await dir.stat()).isDirectory()).toBe(true);
    await dir.close();
  });

  it("does not depend on an external CRT descriptor table", () => {
    expect(moduleSource).not.toMatch(/msvcrt|_get_osfhandle|_open_osfhandle/);
  });
});
