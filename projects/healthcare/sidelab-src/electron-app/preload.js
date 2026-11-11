"use strict";

// Preload — contextIsolation is ON, nodeIntegration is OFF.
// Exposes a minimal, typed bridge for desktop-only features (file save).

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronCDSS", {
  version: process.versions.electron,
  isElectron: true,
  saveSessionToFile: (content) => ipcRenderer.invoke("cdss:save-session", content),
  openSessionFolder: () => ipcRenderer.invoke("cdss:open-sessions"),
});
