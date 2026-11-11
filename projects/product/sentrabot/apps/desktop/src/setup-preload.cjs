const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sentrabotSetup", {
  state: () => ipcRenderer.invoke("desktop.setup.state"),
  test: (url) => ipcRenderer.invoke("desktop.setup.test", url),
  save: (setup) => ipcRenderer.invoke("desktop.setup.save", setup),
  quit: () => ipcRenderer.invoke("desktop.setup.quit"),
});
