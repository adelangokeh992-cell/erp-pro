// Preload script for ERP Desktop (Electron)
// Exposes a safe API to the renderer via window.erpDesktop

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('erpDesktop', {
  // Hardware / License
  getHardwareId: () => ipcRenderer.invoke('license:get-hardware-id'),
  checkLicense: (payload) => ipcRenderer.invoke('license:check', payload),
  activateLicense: (payload) => ipcRenderer.invoke('license:activate', payload),

  // RFID over serial port
  listSerialPorts: () => ipcRenderer.invoke('rfid:list-ports'),
  startRfid: (options) => ipcRenderer.invoke('rfid:start', options),
  stopRfid: () => ipcRenderer.invoke('rfid:stop'),
  onRfidTag: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('rfid:tag', listener);
    return () => ipcRenderer.removeListener('rfid:tag', listener);
  },

  // Printing
  printHtml: (html, options) =>
    ipcRenderer.invoke('printer:print-html', { html, options }),

  // App / Auto-update
  checkForUpdates: () => ipcRenderer.invoke('app:check-updates'),

  // Backup
  backupGetPath: () => ipcRenderer.invoke('backup:get-path'),
  backupSave: (data) => ipcRenderer.invoke('backup:save', data),
  backupList: () => ipcRenderer.invoke('backup:list'),
  backupRestore: (filepath) => ipcRenderer.invoke('backup:restore', filepath),
  backupChooseFile: () => ipcRenderer.invoke('backup:choose-file'),
});

