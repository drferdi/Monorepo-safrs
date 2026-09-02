import {
  closeSync,
  existsSync,
  constants as fsConstants,
  mkdtempSync,
  openSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  __test,
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

  it("removes a freshly created object once its delete-on-close handle closes", () => {
    const parent = { fd: rootFd, path: root };
    const { handle, status } = __test.ntCreateRelative(
      parent,
      "doomed.txt",
      __test.FILE_CREATE,
      __test.FILE_NON_DIRECTORY_FILE |
        __test.FILE_SYNCHRONOUS_IO_NONALERT |
        __test.FILE_OPEN_REPARSE_POINT,
      __test.FILE_ATTRIBUTE_NORMAL,
    );
    expect(status).toBe(0);
    expect(handle).toBeTruthy();
    expect(existsSync(path.join(root, "doomed.txt"))).toBe(true);

    // NTSTATUS_SUCCESS proves the handle carried DELETE access.
    expect(__test.markForDeleteOnClose(handle as object)).toBe(0);
    __test.closeHandle(handle as object);

    expect(existsSync(path.join(root, "doomed.txt"))).toBe(false);
  });

  it("retracts the created file when the identity check fails after an exclusive create", () => {
    const parent = { fd: rootFd, path: root };
    const decoy = path.join(other, "decoy.txt");
    writeFileSync(decoy, "decoy");

    const { handle, status } = __test.ntCreateRelative(
      parent,
      "mismatch.txt",
      __test.FILE_CREATE,
      __test.FILE_NON_DIRECTORY_FILE |
        __test.FILE_SYNCHRONOUS_IO_NONALERT |
        __test.FILE_OPEN_REPARSE_POINT,
      __test.FILE_ATTRIBUTE_NORMAL,
    );
    expect(status).toBe(0);
    expect(existsSync(path.join(root, "mismatch.txt"))).toBe(true);

    expect(() =>
      __test.nodeHandleFromNtHandle(handle as object, fsConstants.O_RDWR, {
        deleteOnMismatch: true,
        open: () => openSync(decoy, fsConstants.O_RDWR),
      }),
    ).toThrow(/escapes/);

    expect(existsSync(path.join(root, "mismatch.txt"))).toBe(false);
    expect(existsSync(decoy)).toBe(true);
  });

  it("leaves an existing file in place when the identity check fails on open", () => {
    const parent = { fd: rootFd, path: root };
    const decoy = path.join(other, "decoy-open.txt");
    writeFileSync(decoy, "decoy");
    writeFileSync(path.join(root, "keep.txt"), "keep");

    const { handle, status } = __test.ntCreateRelative(
      parent,
      "keep.txt",
      __test.FILE_OPEN,
      __test.FILE_NON_DIRECTORY_FILE |
        __test.FILE_SYNCHRONOUS_IO_NONALERT |
        __test.FILE_OPEN_REPARSE_POINT,
      __test.FILE_ATTRIBUTE_NORMAL,
    );
    expect(status).toBe(0);

    expect(() =>
      __test.nodeHandleFromNtHandle(handle as object, fsConstants.O_RDWR, {
        open: () => openSync(decoy, fsConstants.O_RDWR),
      }),
    ).toThrow(/escapes/);

    expect(existsSync(path.join(root, "keep.txt"))).toBe(true);
    expect(readFileSync(path.join(root, "keep.txt"), "utf8")).toBe("keep");
  });
});
