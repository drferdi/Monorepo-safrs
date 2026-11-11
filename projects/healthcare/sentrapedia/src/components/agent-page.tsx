"use client";

import Link from "next/link";
import { useReducer, type ReactNode } from "react";
import { Check, CircleAlert, X } from "lucide-react";
import { initialWorkspace, workspaceReducer } from "../lib/workspace";
import { workspaceStorageKeys } from "../lib/workspace-storage";
import { AgentSettings, type TheOracleIndexInfo } from "./agent-settings";
import { SessionBoundary } from "./auth/session-boundary";
import { useToast, useWorkspacePersistence } from "./workspace-hooks";

// The /agent page shares the workspace record with the encounter page: same storage key per principal, same restore and
// save hook, so a preference saved here is on the home page on the way back.
export function AgentPage({ userId, local, theoracle }: { userId: string; local: boolean; theoracle: TheOracleIndexInfo | null }) {
  return local ? <AgentWorkspace principalId={userId} theoracle={theoracle}/> : <SessionBoundary userId={userId} menuSlot={(signOut, userButton) => <AgentWorkspace principalId={userId} theoracle={theoracle} onSignOut={signOut} userButton={userButton}/>}/>;
}

function AgentWorkspace({ principalId, theoracle, onSignOut, userButton }: { principalId: string; theoracle: TheOracleIndexInfo | null; onSignOut?: () => void; userButton?: ReactNode }) {
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspace);
  const { toast, toastError, notify, dismiss } = useToast();
  const { restoring, storageError } = useWorkspacePersistence(state, dispatch, notify, workspaceStorageKeys(principalId));
  return <main className="agent-page">
    <header className="agent-header">
      <Link className="auth-back" href="/">Kembali ke encounter</Link>
      <h1>Pengaturan Agent</h1>
      <div className="agent-header-account">{userButton}{onSignOut && <button type="button" className="button" onClick={onSignOut}>Keluar</button>}</div>
    </header>
    {storageError && <p className="form-warning" role="alert">{storageError}</p>}
    {restoring ? <p role="status">Memuat pengaturan…</p> : <AgentSettings state={state} dispatch={dispatch} theoracle={theoracle}/>}
    {toast && <div className={`toast ${toastError ? "is-error" : ""}`} role={toastError ? "alert" : "status"}>{toastError ? <CircleAlert size={15}/> : <Check size={15}/>}<span>{toast}</span><button aria-label="Tutup notifikasi" onClick={dismiss}><X size={14}/></button></div>}
  </main>;
}
