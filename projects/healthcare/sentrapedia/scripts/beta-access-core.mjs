// Provider-injected operator; no alternate API URL, email lookup or automatic approval.
export async function operateBetaAccess({ action, userId, secretKey, provider }) {
  if (!["disable", "enable"].includes(action) || !/^user_[A-Za-z0-9]{1,120}$/.test(userId ?? "") || !/^sk_(test|live)_[A-Za-z0-9_-]{8,}$/.test(secretKey ?? "")) throw new Error("Invalid beta access operation or configuration.");
  const deadline = Date.now() + 60_000;
  async function bounded(work) {
    let timer;
    try {
      const remaining = Math.min(5000, deadline - Date.now());
      if (remaining <= 0) throw new Error("deadline");
      return await Promise.race([Promise.resolve().then(work), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("deadline")), remaining); })]);
    } finally { clearTimeout(timer); }
  }
  try {
    const client = provider(secretKey);
    await bounded(() => client.users.updateUserMetadata(userId, { privateMetadata: { sentrapediaBetaAccess: { disabled: action === "disable" } } }));
    if (action === "enable") return { revoked: 0 };
    // Snapshot pages before revocation: offset pagination over a changing active list skips sessions.
    const ids = new Set();
    for (let offset = 0; ; offset += 100) {
      if (offset >= 10_000) throw new Error("session limit");
      const page = await bounded(() => client.sessions.getSessionList({ userId, status: "active", limit: 100, offset }));
      if (!Array.isArray(page.data) || !Number.isSafeInteger(page.totalCount) || page.totalCount < 0) throw new Error("invalid page");
      for (const session of page.data) { if (!/^sess_[A-Za-z0-9]+$/.test(session.id)) throw new Error("invalid session"); ids.add(session.id); }
      if (offset + page.data.length >= page.totalCount) break;
      if (!page.data.length) throw new Error("incomplete page");
    }
    let revoked = 0, failed = false;
    for (const id of ids) {
      try { await bounded(() => client.sessions.revokeSession(id)); revoked++; }
      catch { failed = true; }
    }
    if (failed) throw new Error("partial revocation");
    return { revoked };
  } catch { throw new Error("Beta access operation failed. Verify the disabled flag and retry session revocation before enabling access."); }
}
