"use client";

import { clearUnreadableStorage, type WorkspaceStorageKeys } from "../lib/workspace-storage";
import type { Dispatch } from "react";
import { useState } from "react";
import { pullSyncedDocuments, pushEncountersToServer } from "../lib/sync/client";
import { mergePulledDocuments } from "../lib/sync/merge";
import { pullMessage, pushMessage, syncFailureMessage } from "../lib/sync/messages";
import { newEncounter, type Encounter, type Patient, type Workspace, type WorkspaceAction } from "../lib/workspace";
import { ContextForm, EncounterForm, ListForm, PatientForm, SearchDialog, SettingsForm } from "./forms";
import { Scribe } from "./scribe";
import type { DialogName } from "./sidebar";
import { AccountDialog, LegalDialog, UpgradeDialog } from "./workspace-dialogs";

// The dialogs that edit workspace records, rendered last in the app shell.
export function WorkspaceDialogs({ storageKeys, onStorageReset, dialog, dialogId, state, dispatch, context, encounter, unreadable, onClose, notify, onSavePatient, onOpen, onSelect, onScribe, onPromptReset, onUnreadableCleared }: { storageKeys: WorkspaceStorageKeys; onStorageReset: () => void; dialog: DialogName; dialogId?: string; state: Workspace; dispatch: Dispatch<WorkspaceAction>; context: string; encounter?: Encounter; unreadable: string | null; onClose: () => void; notify: (text: string, tone?: "error") => void; onSavePatient: (patient: Patient) => void; onOpen: (name: DialogName, id?: string) => void; onSelect: (id: string) => void; onScribe: (transcript: string) => void; onPromptReset: () => void; onUnreadableCleared: () => void }) {
  const editedEncounter = state.encounters.find((e) => e.id === dialogId);
  const [syncBusy, setSyncBusy] = useState(false);
  // Sync never disturbs the workspace on failure: the browser copy is authoritative, so a failed call only
  // produces a message. A pull dispatches "restore" with the merged workspace, which the save effect persists.
  async function runSync(work: () => Promise<void>) {
    if (syncBusy) return;
    setSyncBusy(true);
    try { await work(); } finally { setSyncBusy(false); }
  }
  const pushToServer = () => runSync(async () => {
    const outcome = await pushEncountersToServer(state.encounters);
    if (!outcome.ok) { notify(syncFailureMessage(outcome.reason), "error"); return; }
    notify(pushMessage(outcome.value), outcome.value.held.length ? "error" : undefined);
  });
  const pullFromServer = () => runSync(async () => {
    const outcome = await pullSyncedDocuments();
    if (!outcome.ok) { notify(syncFailureMessage(outcome.reason), "error"); return; }
    const merged = mergePulledDocuments(state, outcome.value);
    if (merged.added.length) dispatch({ type: "restore", state: merged.workspace });
    notify(pullMessage(merged));
  });
  return <>
    {dialog === "patient" && <PatientForm key={dialogId ?? "new"} patient={state.patients.find((p) => p.id === dialogId)} onSave={onSavePatient} onDelete={(id) => { dispatch({ type: "patient.delete", id }); onClose(); notify("Pasien lokal dan Encounter terkait dihapus."); }} onClose={onClose}/>}
    {dialog === "list" && <ListForm key={dialogId ?? "new"} list={state.lists.find((l) => l.id === dialogId)} state={state} dispatch={dispatch} onClose={onClose}/>}
    {dialog === "settings" && <SettingsForm settings={state.settings} onSave={(settings) => { dispatch({ type: "settings.save", settings }); onClose(); notify("Preferensi Agent tersimpan."); }} onClose={onClose}/>}
    {dialog === "search" && <SearchDialog state={state} onSelect={onSelect} onPatient={(id) => onOpen("patient", id)} onClose={onClose}/>}
    {dialog === "context" && <ContextForm context={context} onSave={(text) => { if (encounter) dispatch({ type: "encounter.update", id: encounter.id, updates: { context: text } }); else if (text.trim()) dispatch({ type: "encounter.add", encounter: { ...newEncounter(), context: text } }); onClose(); notify(text ? "Konteks ditambahkan ke Encounter ini." : "Konteks Encounter dikosongkan."); }} onClose={onClose}/>}
    {dialog === "scribe" && <Scribe language={state.settings.language} onClose={onClose} onGenerate={onScribe}/>}
    {dialog === "encounter" && editedEncounter && <EncounterForm key={editedEncounter.id} encounter={editedEncounter} patients={state.patients} onSave={(updates) => { dispatch({ type: "encounter.update", id: editedEncounter.id, updates }); onClose(); notify("Detail Encounter tersimpan."); }} onDelete={() => { dispatch({ type: "encounter.delete", id: editedEncounter.id }); onClose(); notify("Encounter lokal dihapus."); }} onClose={onClose}/>}
    {dialog === "upgrade" && <UpgradeDialog onClose={onClose}/>}
    {dialog === "account" && <AccountDialog state={state} unreadable={unreadable} onRestore={(restored) => { onStorageReset(); dispatch({ type: "restore", state: restored }); onPromptReset(); onClose(); notify("Backup workspace dipulihkan."); }} onClear={() => { onStorageReset(); dispatch({ type: "clear" }); try { clearUnreadableStorage(localStorage, storageKeys); } catch { /* storage unavailable: nothing to remove */ } onUnreadableCleared(); onPromptReset(); onClose(); notify("Workspace lokal dikosongkan."); }} onInvalidImport={() => notify("Berkas bukan backup workspace Sentrapedia yang valid.", "error")} onPush={pushToServer} onPull={pullFromServer} syncBusy={syncBusy} onClose={onClose}/>}
    {dialog === "legal" && <LegalDialog title={dialogId} onClose={onClose}/>}
  </>;
}
