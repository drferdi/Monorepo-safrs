const RESET_REJECTED_PREFIX = "[DATABASE] RESET DITOLAK";

function rejectReset(): never {
  throw new Error(
    `${RESET_REJECTED_PREFIX}: target database tidak disposable.`,
  );
}

export function assertDisposableDatabase(connectionUrl: string): URL {
  let target: URL;

  try {
    target = new URL(connectionUrl);
  } catch {
    return rejectReset();
  }

  if (
    target.protocol !== "postgresql:" ||
    !target.password ||
    (target.hostname !== "127.0.0.1" && target.hostname !== "localhost") ||
    target.port !== "54329" ||
    target.pathname.split("/").filter(Boolean).length !== 1 ||
    (!target.pathname.endsWith("_local") &&
      !target.pathname.endsWith("_test")) ||
    target.search !== ""
  ) {
    return rejectReset();
  }

  return target;
}

export function assertDisposableTestDatabase(connectionUrl: string): URL {
  const target = assertDisposableDatabase(connectionUrl);

  if (!target.pathname.endsWith("_test")) {
    return rejectReset();
  }

  return target;
}
