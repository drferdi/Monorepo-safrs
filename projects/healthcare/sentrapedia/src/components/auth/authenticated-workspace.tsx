"use client";
import { WorkspaceApp } from "../workspace";
import { SessionBoundary } from "./session-boundary";

export function AuthenticatedWorkspace({ userId, local = false }: { userId: string; local?: boolean }) {
  return local ? <WorkspaceApp key={userId}/> : <SessionBoundary userId={userId}><WorkspaceApp key={userId}/></SessionBoundary>;
}
