/**
 * URBAN MART Preload Bridge for Windows Desktop
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  printThermalReceipt: (options) => ipcRenderer.invoke('print-thermal-receipt', options),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
});
