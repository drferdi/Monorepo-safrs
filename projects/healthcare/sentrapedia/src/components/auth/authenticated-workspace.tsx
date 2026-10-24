"use client";
import { WorkspaceApp } from "../workspace";
import { SessionBoundary } from "./session-boundary";

export function AuthenticatedWorkspace({ userId, local = false }: { userId: string; local?: boolean }) {
  return local ? <WorkspaceApp principalId={userId}/> : <SessionBoundary userId={userId}><WorkspaceApp principalId={userId}/></SessionBoundary>;
}
