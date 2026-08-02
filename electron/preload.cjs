const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getTheme: () => ipcRenderer.invoke('get-theme'),
  setTheme: (theme) => ipcRenderer.send('set-theme', theme),
  getServerUrls: () => ipcRenderer.invoke('get-server-urls'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  windowControls: {
    minimize: () => ipcRenderer.send('window-minimize'),
    close: () => ipcRenderer.send('window-close')
  }
});