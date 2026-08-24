const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('avery', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onWindowStateChange: (callback) => {
    ipcRenderer.on('window:state-changed', (event, data) => callback(data));
  },

  // System telemetry & data
  getStatus: () => ipcRenderer.invoke('system:getStatus'),
  getLogs: (maxLines) => ipcRenderer.invoke('system:getLogs', maxLines),
  getTraffic: (maxItems) => ipcRenderer.invoke('system:getTraffic', maxItems),
  getScripts: () => ipcRenderer.invoke('system:getScripts'),
  getAvatarData: () => ipcRenderer.invoke('system:getAvatarData'),

  // Actions & Execution
  runScript: (name) => ipcRenderer.invoke('system:runScript', name),
  executeAction: (action) => ipcRenderer.invoke('system:executeAction', action),
});
