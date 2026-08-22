import { contextBridge, ipcRenderer } from "electron";
import { validateIpcRequest } from "./security.js";

contextBridge.exposeInMainWorld("sentrabotDesktop", {
  getOrigin: () => ipcRenderer.invoke("get-origin"),
  openExternal: (url: string) =>
    ipcRenderer.invoke(
      "open-external",
      validateIpcRequest({ channel: "open-external", value: url }),
    ),
});
