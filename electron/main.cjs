/**
 * URBAN MART SUPERMARKET CRM & POS
 * Electron Desktop Main Process
 * Windows Desktop Application Launcher & POS Hardware Bridge
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow = null;

// Enforce single instance lock across counters
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createWindow);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'URBAN MART CRM & Supermarket Management System',
    icon: path.join(__dirname, '../public/favicon.ico'),
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      spellcheck: false,
    },
    autoHideMenuBar: true,
  });

  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Fullscreen toggle for POS checkout counter (F11)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    }
  });
}

// IPC: Direct Silent ESC/POS Thermal Printing Handler
ipcMain.handle('print-thermal-receipt', async (event, { printerName, silent = true }) => {
  if (!mainWindow) return { success: false, error: 'No active window' };

  return new Promise((resolve) => {
    mainWindow.webContents.print(
      {
        silent: silent,
        printBackground: true,
        deviceName: printerName || '',
        margins: { marginType: 'none' },
        pageSize: { width: 80000, height: 297000 }, // 80mm roll standard
      },
      (success, failureReason) => {
        resolve({ success, error: failureReason });
      }
    );
  });
});

// IPC: List installed Windows printers
ipcMain.handle('get-printers', async () => {
  if (!mainWindow) return [];
  return mainWindow.webContents.getPrintersAsync();
});

// Window lifecycle
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
