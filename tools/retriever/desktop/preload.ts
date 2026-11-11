import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('sentraHarvester', {
  startScrape: (options: Record<string, unknown>) => ipcRenderer.invoke('harvester:start', options),
  stopScrape: () => ipcRenderer.invoke('harvester:stop'),
  getProfiles: () => ipcRenderer.invoke('harvester:profiles'),
  openFolder: (targetPath: string) => ipcRenderer.invoke('system:open-folder', targetPath),
  openUrl: (url: string) => ipcRenderer.invoke('system:open-url', url),
  preview: (targetPath?: string) => ipcRenderer.invoke('harvester:preview', targetPath),
  getWindowPos: () => ipcRenderer.invoke('window:get-pos'),
  setWindowPos: (x: number, y: number) => ipcRenderer.send('window:set-pos', { x, y }),
  close: () => ipcRenderer.send('window:close'),
  minimize: () => ipcRenderer.send('window:minimize'),
  zoom: () => ipcRenderer.send('window:zoom'),
  onLog: (callback: (payload: { type: string; message: string; timestamp?: string }) => void) => {
    const handler = (_event: unknown, payload: any) => callback(payload);
    ipcRenderer.on('harvester:log', handler);
    return () => ipcRenderer.removeListener('harvester:log', handler);
  }
});
