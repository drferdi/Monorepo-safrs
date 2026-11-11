import {
  close as closeCb,
  closeSync,
  fchmod as fchmodCb,
  constants as fsConstants,
  fstat as fstatCb,
  fstatSync,
  ftruncate as ftruncateCb,
  openSync,
  writeFile as writeFileCb,
} from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import koffi from "koffi";

const closeFd = promisify(closeCb);
const fchmodFd = promisify(fchmodCb);
const fstatFd = promisify(fstatCb);
const ftruncateFd = promisify(ftruncateCb);
const writeFileFd = promisify(writeFileCb) as (
  fd: number,
  data: string | Uint8Array,
) => Promise<void>;

const FILE_OPEN = 1;
const FILE_CREATE = 2;
const FILE_DIRECTORY_FILE = 0x00000001;
const FILE_NON_DIRECTORY_FILE = 0x00000040;
const FILE_SYNCHRONOUS_IO_NONALERT = 0x00000020;
const FILE_OPEN_REPARSE_POINT = 0x00200000;
const OBJ_CASE_INSENSITIVE = 0x00000040;
const GENERIC_READ = 0x80000000;
const GENERIC_WRITE = 0x40000000;
const SYNCHRONIZE = 0x00100000;
/** Standard right required before FileDispositionInformation may set delete-on-close. */
const DELETE_ACCESS = 0x00010000;
/** FILE_INFORMATION_CLASS.FileDispositionInformation */
const FILE_DISPOSITION_INFORMATION_CLASS = 13;
const FILE_SHARE_ALL = 0x00000007;
const FILE_ATTRIBUTE_NORMAL = 0x00000080;
const FILE_ATTRIBUTE_DIRECTORY = 0x00000010;
const OPEN_EXISTING = 3;
const FILE_FLAG_BACKUP_SEMANTICS = 0x02000000;
const FILE_FLAG_OPEN_REPARSE_POINT = 0x00200000;
/** NTSTATUS 0xC0000035 as signed int32 */
const STATUS_OBJECT_NAME_COLLISION = -1073741771;
/** NTSTATUS 0xC0000034 as signed int32 */
const STATUS_OBJECT_NAME_NOT_FOUND = -1073741772;
/** NTSTATUS 0xC000003A as signed int32 */
const STATUS_OBJECT_PATH_NOT_FOUND = -1073741763;

function escapeWorkspace(): never {
  throw new Error("Path escapes the computer workspace");
}

/** Raw Win32 HANDLE as koffi surfaces it (integer for intptr_t, pointer object for void *). */
type Win32Handle = number | bigint | object;

type NtFns = {
  NtCreateFile: koffi.KoffiFunction;
  NtSetInformationFile: koffi.KoffiFunction;
  RtlInitUnicodeString: koffi.KoffiFunction;
  CreateFileW: koffi.KoffiFunction;
  GetFileInformationByHandle: koffi.KoffiFunction;
  CloseHandle: koffi.KoffiFunction;
  GetFinalPathNameByHandleW: koffi.KoffiFunction;
  objectAttributesSize: number;
  fileDispositionInformationSize: number;
};

let cached: NtFns | undefined | null;

/** True when real Win32 NT APIs loaded (false on Linux hosts that only mock win32). */
export function win32NtRelativeAvailable(): boolean {
  if (process.platform !== "win32") return false;
  try {
    nt();
    return true;
  } catch {
    cached = null;
    return false;
  }
}

function nt(): NtFns {
  if (cached === null) throw new Error("Win32 NT APIs unavailable");
  if (cached) return cached;
  const ntdll = koffi.load("ntdll.dll");
  const kernel32 = koffi.load("kernel32.dll");

  koffi.struct("UNICODE_STRING", {
    Length: "uint16_t",
    MaximumLength: "uint16_t",
    Buffer: "void *",
  });
  const OBJECT_ATTRIBUTES = koffi.struct("OBJECT_ATTRIBUTES", {
    Length: "uint32_t",
    RootDirectory: "void *",
    ObjectName: "UNICODE_STRING *",
    Attributes: "uint32_t",
    SecurityDescriptor: "void *",
    SecurityQualityOfService: "void *",
  });
  koffi.struct("IO_STATUS_BLOCK", {
    Status: "intptr_t",
    Information: "uintptr_t",
  });
  const FILE_DISPOSITION_INFORMATION = koffi.struct("FILE_DISPOSITION_INFORMATION", {
    DeleteFile: "uint8_t",
  });
  koffi.struct("BY_HANDLE_FILE_INFORMATION", {
    dwFileAttributes: "uint32_t",
    ftCreationTimeLow: "uint32_t",
    ftCreationTimeHigh: "uint32_t",
    ftLastAccessTimeLow: "uint32_t",
    ftLastAccessTimeHigh: "uint32_t",
    ftLastWriteTimeLow: "uint32_t",
    ftLastWriteTimeHigh: "uint32_t",
    dwVolumeSerialNumber: "uint32_t",
    nFileSizeHigh: "uint32_t",
    nFileSizeLow: "uint32_t",
    nNumberOfLinks: "uint32_t",
    nFileIndexHigh: "uint32_t",
    nFileIndexLow: "uint32_t",
  });

  cached = {
    NtCreateFile: ntdll.func(
      "int32_t __stdcall NtCreateFile(_Out_ void **FileHandle, uint32_t DesiredAccess, OBJECT_ATTRIBUTES *ObjectAttributes, IO_STATUS_BLOCK *IoStatusBlock, void *AllocationSize, uint32_t FileAttributes, uint32_t ShareAccess, uint32_t CreateDisposition, uint32_t CreateOptions, void *EaBuffer, uint32_t EaLength)",
    ),
    NtSetInformationFile: ntdll.func(
      "int32_t __stdcall NtSetInformationFile(void *FileHandle, IO_STATUS_BLOCK *IoStatusBlock, FILE_DISPOSITION_INFORMATION *FileInformation, uint32_t Length, uint32_t FileInformationClass)",
    ),
    RtlInitUnicodeString: ntdll.func(
      "void __stdcall RtlInitUnicodeString(_Out_ UNICODE_STRING *DestinationString, void *SourceString)",
    ),
    CreateFileW: kernel32.func(
      "intptr_t __stdcall CreateFileW(void *lpFileName, uint32_t dwDesiredAccess, uint32_t dwShareMode, void *lpSecurityAttributes, uint32_t dwCreationDisposition, uint32_t dwFlagsAndAttributes, void *hTemplateFile)",
    ),
    GetFileInformationByHandle: kernel32.func(
      "int __stdcall GetFileInformationByHandle(void *hFile, _Out_ BY_HANDLE_FILE_INFORMATION *lpFileInformation)",
    ),
    CloseHandle: kernel32.func("int __stdcall CloseHandle(void *hObject)"),
    GetFinalPathNameByHandleW: kernel32.func(
      "uint32_t __stdcall GetFinalPathNameByHandleW(void *hFile, void *lpszFilePath, uint32_t cchFilePath, uint32_t dwFlags)",
    ),
    objectAttributesSize: koffi.sizeof(OBJECT_ATTRIBUTES),
    fileDispositionInformationSize: koffi.sizeof(FILE_DISPOSITION_INFORMATION),
  };
  return cached;
}

/** NTSTATUS 0xC0000001 as signed int32, returned when the mark could not even be attempted. */
const STATUS_UNSUCCESSFUL = -1073741823;

/**
 * Set delete-on-close on the object the handle names, so it disappears when the last
 * handle to it closes. Addresses the inode through the handle, never through a pathname,
 * so nothing that was swapped into the name in the meantime can be hit. Never throws:
 * the caller is already unwinding an error it must not lose.
 */
function markForDeleteOnClose(handle: Win32Handle): number {
  try {
    const api = nt();
    const ioStatus = {};
    return api.NtSetInformationFile(
      handle,
      ioStatus,
      { DeleteFile: 1 },
      api.fileDispositionInformationSize >>> 0,
      FILE_DISPOSITION_INFORMATION_CLASS >>> 0,
    ) as number;
  } catch {
    return STATUS_UNSUCCESSFUL;
  }
}

/**
 * Resolve the current filesystem path of an open Windows file/directory handle.
 * After a rename/junction swap of the original pathname, this still returns the
 * path of the held inode.
 */
function finalPathFromHandle(handle: Win32Handle): string {
  const api = nt();
  const flags = 0; // VOLUME_NAME_DOS
  const size = api.GetFinalPathNameByHandleW(handle, null, 0, flags) as number;
  if (size === 0) escapeWorkspace();

  const buf = Buffer.alloc((size + 1) * 2);
  const written = api.GetFinalPathNameByHandleW(handle, buf, size + 1, flags) as number;
  if (written === 0) escapeWorkspace();

  let resolved = buf.toString("utf16le", 0, written * 2);
  if (resolved.startsWith("\\\\?\\UNC\\"))
    resolved = `\\\\${resolved.slice("\\\\?\\UNC\\".length)}`;
  else if (resolved.startsWith("\\\\?\\")) resolved = resolved.slice("\\\\?\\".length);
  return resolved;
}

type FileIdentity = { dev: bigint; ino: bigint };

/** Volume serial + 64-bit file index of a Win32 handle, matching libuv's st_dev/st_ino. */
function identityFromHandle(handle: Win32Handle): FileIdentity {
  const api = nt();
  const info: Record<string, number> = {};
  const ok = api.GetFileInformationByHandle(handle, info) as number;
  if (!ok) escapeWorkspace();
  const high = info.nFileIndexHigh ?? 0;
  const low = info.nFileIndexLow ?? 0;
  return {
    dev: BigInt((info.dwVolumeSerialNumber ?? 0) >>> 0),
    ino: (BigInt(high >>> 0) << 32n) | BigInt(low >>> 0),
  };
}

function identityFromFd(fd: number): FileIdentity {
  const stats = fstatSync(fd, { bigint: true });
  return { dev: BigInt(stats.dev), ino: BigInt(stats.ino) };
}

function assertSameIdentity(handle: Win32Handle, fd: number) {
  const fromHandle = identityFromHandle(handle);
  const fromFd = identityFromFd(fd);
  if (fromHandle.dev !== fromFd.dev || fromHandle.ino !== fromFd.ino) escapeWorkspace();
}

/**
 * Open a Win32 directory handle for the inode pinned by `parent.fd`. Node links its
 * own CRT, so its descriptors are not visible to any external fd table; the pathname
 * is re-opened and then required to name the very inode the held descriptor pins, so
 * a junction swap of the pathname fails closed instead of redirecting the operation.
 */
export function directoryHandleFor(parent: { fd: number; path: string }): Win32Handle {
  const api = nt();
  const nameBuf = Buffer.from(`${path.win32.toNamespacedPath(parent.path)}\0`, "utf16le");
  const handle = api.CreateFileW(
    nameBuf,
    (GENERIC_READ | SYNCHRONIZE) >>> 0,
    FILE_SHARE_ALL >>> 0,
    null,
    OPEN_EXISTING,
    (FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT) >>> 0,
    null,
  ) as number | bigint;
  if (handle === -1 || handle === -1n || handle === 0 || handle === 0n) escapeWorkspace();
  try {
    assertSameIdentity(handle, parent.fd);
  } catch (error) {
    api.CloseHandle(handle);
    throw error;
  }
  return handle;
}

function assertLeafName(name: string) {
  if (!name || name === "." || name === ".." || /[\\/]/.test(name)) escapeWorkspace();
}

function ntCreateRelative(
  parent: { fd: number; path: string },
  name: string,
  createDisposition: number,
  createOptions: number,
  fileAttributes: number,
): { handle: Win32Handle | undefined; status: number } {
  assertLeafName(name);
  const api = nt();
  const root = directoryHandleFor(parent);
  try {
    const nameBuf = Buffer.from(`${name}\0`, "utf16le");
    const uni = {};
    api.RtlInitUnicodeString(uni, nameBuf);

    const objectAttributes = {
      Length: api.objectAttributesSize,
      RootDirectory: root,
      ObjectName: uni,
      Attributes: OBJ_CASE_INSENSITIVE,
      SecurityDescriptor: null,
      SecurityQualityOfService: null,
    };
    const ioStatus = {};
    const handleOut: Array<unknown> = [null];
    // DELETE is requested only for objects this call creates, so a failed identity check
    // can retract them through the handle. Opens of existing objects keep the old mask.
    const deleteAccess = createDisposition === FILE_CREATE ? DELETE_ACCESS : 0;
    const status = api.NtCreateFile(
      handleOut,
      (GENERIC_READ | GENERIC_WRITE | SYNCHRONIZE | deleteAccess) >>> 0,
      objectAttributes,
      ioStatus,
      null,
      fileAttributes >>> 0,
      FILE_SHARE_ALL >>> 0,
      createDisposition >>> 0,
      createOptions >>> 0,
      null,
      0,
    ) as number;

    if (status !== 0) return { handle: undefined, status };

    const handle = handleOut[0] as Win32Handle | null;
    if (handle == null) escapeWorkspace();
    return { handle, status: 0 };
  } finally {
    api.CloseHandle(root);
  }
}

/**
 * Bind a Node descriptor to the inode just produced by NtCreateFile. The NT handle
 * names the inode; its final path is re-opened by Node and then required to be the
 * same inode, so a swap between the two opens fails closed.
 */
function nodeHandleFromNtHandle(
  handle: Win32Handle,
  flags: number,
  options: {
    /** Retract the object through its handle when the identity check fails. */
    deleteOnMismatch?: boolean;
    /** Test seam only: substitutes the re-open so a mismatch can be provoked. */
    open?: (target: string, openFlags: number) => number;
  } = {},
) {
  const api = nt();
  let fd = -1;
  let finalPath = "";
  try {
    finalPath = finalPathFromHandle(handle);
    fd = (options.open ?? openSync)(finalPath, flags);
    assertSameIdentity(handle, fd);
  } catch (error) {
    if (fd >= 0) closeSync(fd);
    if (options.deleteOnMismatch) markForDeleteOnClose(handle);
    api.CloseHandle(handle);
    throw error;
  }
  return fileHandleFromFd(fd, finalPath, handle);
}

/** Duck-typed FileHandle surface used by desktop-sandbox writes. */
export function fileHandleFromFd(fd: number, filePath: string, ntHandle: unknown) {
  return {
    fd,
    path: filePath,
    ntHandle,
    stat: (opts?: { bigint?: boolean }) => fstatFd(fd, opts as never),
    truncate: (len = 0) => ftruncateFd(fd, len),
    writeFile: (data: string | Uint8Array) => writeFileFd(fd, data),
    chmod: (mode: number) => fchmodFd(fd, mode),
    close: async () => {
      try {
        nt().CloseHandle(ntHandle as Win32Handle);
      } catch {
        // Releasing the descriptor still has to happen when the native close fails.
      }
      await closeFd(fd);
    },
  };
}

export type Win32FileHandle = ReturnType<typeof fileHandleFromFd>;

/**
 * Live final path of the inode the handle holds. Queried on every call so a rename
 * of the original name still resolves to the inode actually being written.
 */
export function pathFromHandle(handle: Win32FileHandle): string {
  return finalPathFromHandle(handle.ntHandle as Win32Handle);
}

export function openExistingChildViaDirectoryFdWin32(
  parent: { fd: number; path: string },
  name: string,
) {
  const { handle, status } = ntCreateRelative(
    parent,
    name,
    FILE_OPEN,
    FILE_NON_DIRECTORY_FILE | FILE_SYNCHRONOUS_IO_NONALERT | FILE_OPEN_REPARSE_POINT,
    FILE_ATTRIBUTE_NORMAL,
  );
  if (status === STATUS_OBJECT_NAME_NOT_FOUND || status === STATUS_OBJECT_PATH_NOT_FOUND) {
    const err = new Error("ENOENT") as NodeJS.ErrnoException;
    err.code = "ENOENT";
    throw err;
  }
  if (status !== 0 || handle == null) escapeWorkspace();
  return nodeHandleFromNtHandle(handle, fsConstants.O_RDWR);
}

export function createExclusiveChildViaDirectoryFdWin32(
  parent: { fd: number; path: string },
  name: string,
) {
  const { handle, status } = ntCreateRelative(
    parent,
    name,
    FILE_CREATE,
    FILE_NON_DIRECTORY_FILE | FILE_SYNCHRONOUS_IO_NONALERT | FILE_OPEN_REPARSE_POINT,
    FILE_ATTRIBUTE_NORMAL,
  );
  if (status === STATUS_OBJECT_NAME_COLLISION) {
    const err = new Error("EEXIST") as NodeJS.ErrnoException;
    err.code = "EEXIST";
    throw err;
  }
  if (status !== 0 || handle == null) escapeWorkspace();
  return nodeHandleFromNtHandle(handle, fsConstants.O_RDWR, { deleteOnMismatch: true });
}

/** Creates a child directory relative to the held parent. Returns its final path when available. */
export function mkdirChildViaDirectoryFdWin32(
  parent: { fd: number; path: string },
  name: string,
): string | undefined {
  const { handle, status } = ntCreateRelative(
    parent,
    name,
    FILE_CREATE,
    FILE_DIRECTORY_FILE | FILE_SYNCHRONOUS_IO_NONALERT | FILE_OPEN_REPARSE_POINT,
    FILE_ATTRIBUTE_DIRECTORY,
  );
  if (status === STATUS_OBJECT_NAME_COLLISION) {
    const err = new Error("EEXIST") as NodeJS.ErrnoException;
    err.code = "EEXIST";
    throw err;
  }
  if (status !== 0 || handle == null) escapeWorkspace();
  let createdPath: string | undefined;
  try {
    createdPath = finalPathFromHandle(handle);
  } catch {
    createdPath = undefined;
  }
  nt().CloseHandle(handle);
  return createdPath;
}

export function openChildDirectoryViaDirectoryFdWin32(
  parent: { fd: number; path: string },
  name: string,
) {
  const { handle, status } = ntCreateRelative(
    parent,
    name,
    FILE_OPEN,
    FILE_DIRECTORY_FILE | FILE_SYNCHRONOUS_IO_NONALERT | FILE_OPEN_REPARSE_POINT,
    FILE_ATTRIBUTE_DIRECTORY,
  );
  if (status !== 0 || handle == null) escapeWorkspace();
  return nodeHandleFromNtHandle(handle, fsConstants.O_RDONLY);
}

/**
 * Test seam, not public API. An identity mismatch cannot be provoked from outside:
 * the re-open follows the handle's own final path, so it always lands on the same
 * inode. Tests inject a different descriptor to exercise the failure branch.
 */
export const __test = {
  ntCreateRelative,
  nodeHandleFromNtHandle,
  markForDeleteOnClose,
  closeHandle: (handle: Win32Handle) => nt().CloseHandle(handle),
  FILE_CREATE,
  FILE_OPEN,
  FILE_NON_DIRECTORY_FILE,
  FILE_SYNCHRONOUS_IO_NONALERT,
  FILE_OPEN_REPARSE_POINT,
  FILE_ATTRIBUTE_NORMAL,
};
