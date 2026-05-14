const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  updateSize: (width, height) => ipcRenderer.send('update-size', { width, height }),
  onConfigUpdate: (callback) => ipcRenderer.on('update-config', (event, config) => callback(config)),
  onShowPreview: (callback) => ipcRenderer.on('show-preview', () => callback()),
  onHidePreview: (callback) => ipcRenderer.on('hide-preview', () => callback()),
  onWindowMoving: (callback) => ipcRenderer.on('window-moving', (event, data) => callback(data)),
  onWindowMovingEnd: (callback) => ipcRenderer.on('window-moving-end', () => callback())
});
