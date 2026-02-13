// Electron main process for ERP Desktop
// - In التطوير: يفتح http://localhost:3000 (بعد تشغيل React بـ `yarn start`)
// - في الإنتاج: يفتح build/index.html من نفس مجلد المشروع

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;
const BACKEND_URL = process.env.BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:8002';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const startUrl =
    process.env.ELECTRON_START_URL ||
    `file://${path.join(__dirname, 'build', 'index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ----- IPC: License / Hardware ID -----
function getHardwareId() {
  try {
    const { machineIdSync } = require('node-machine-id');
    return machineIdSync();
  } catch (e) {
    return `fallback_${require('os').hostname()}_${process.platform}`;
  }
}

async function licenseRequest(endpoint, payload) {
  const url = `${BACKEND_URL.replace(/\/$/, '')}/api/licenses/${endpoint}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

ipcMain.handle('license:get-hardware-id', () => Promise.resolve(getHardwareId()));
ipcMain.handle('license:check', (_, payload) => licenseRequest('check', payload));
ipcMain.handle('license:activate', (_, payload) => licenseRequest('activate', payload));

// ----- IPC: Auto-Update -----
ipcMain.handle('app:check-updates', async () => {
  if (app.isPackaged) {
    try {
      const { autoUpdater } = require('electron-updater');
      autoUpdater.autoDownload = false;
      const result = await autoUpdater.checkForUpdatesAndNotify();
      return { check: true, updateInfo: result?.updateInfo || null };
    } catch (e) {
      return { check: false, error: e.message };
    }
  }
  return { check: false, error: 'Not packaged' };
});

// ----- IPC: Backup -----
const getBackupDir = () => path.join(app.getPath('userData'), 'backups');

ipcMain.handle('backup:get-path', () => getBackupDir());

ipcMain.handle('backup:save', async (_, data) => {
  const dir = getBackupDir();
  await fs.mkdir(dir, { recursive: true });
  const filename = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const filepath = path.join(dir, filename);
  await fs.writeFile(filepath, JSON.stringify(data), 'utf8');
  return { ok: true, path: filepath };
});

ipcMain.handle('backup:list', async () => {
  const dir = getBackupDir();
  try {
    const names = await fs.readdir(dir);
    const files = await Promise.all(
      names.filter((n) => n.endsWith('.json')).map(async (n) => {
        const p = path.join(dir, n);
        const stat = await fs.stat(p);
        return { name: n, path: p, mtime: stat.mtime };
      })
    );
    files.sort((a, b) => b.mtime - a.mtime);
    return files;
  } catch {
    return [];
  }
});

ipcMain.handle('backup:restore', async (_, filepath) => {
  const content = await fs.readFile(filepath, 'utf8');
  return JSON.parse(content);
});

ipcMain.handle('backup:choose-file', async () => {
  const win = mainWindow || BrowserWindow.getFocusedWindow();
  const { filePaths } = await dialog.showOpenDialog(win || undefined, {
    properties: ['openFile'],
    filters: [{ name: 'Backup JSON', extensions: ['json'] }],
  });
  return filePaths[0] || null;
});

// ----- IPC: Printer -----
ipcMain.handle('printer:print-html', async (_, { html, options = {} }) => {
  return new Promise((resolve) => {
    const printWin = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: false },
    });
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    printWin.loadURL(dataUrl);
    printWin.webContents.once('did-finish-load', () => {
      printWin.webContents.print(
        { silent: options.silent !== false, printBackground: true, ...options },
        (success, err) => {
          printWin.close();
          resolve({ ok: success, error: err });
        }
      );
    });
  });
});

// ----- IPC: RFID over Serial (COM) -----
let currentRfidPort = null;
let rfidLineBuffer = '';

function getRfidWindow() {
  return mainWindow && mainWindow.webContents && !mainWindow.isDestroyed() ? mainWindow.webContents : null;
}

ipcMain.handle('rfid:list-ports', async () => {
  try {
    const { SerialPort } = require('serialport');
    const ports = await SerialPort.list();
    return ports.map((p) => ({
      path: p.path,
      manufacturer: p.manufacturer || '',
      vendorId: p.vendorId || '',
      productId: p.productId || '',
    }));
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('rfid:start', async (_, options = {}) => {
  const { path: portPath, baudRate = 9600 } = options;
  if (!portPath) {
    return { ok: false, error: 'Port path required' };
  }
  try {
    if (currentRfidPort) {
      try {
        currentRfidPort.close();
      } catch (_) {}
      currentRfidPort = null;
      rfidLineBuffer = '';
    }
    const { SerialPort } = require('serialport');
    currentRfidPort = new SerialPort(
      { path: portPath, baudRate },
      (err) => {
        if (err) {
          const win = getRfidWindow();
          if (win) win.send('rfid:error', { error: err.message });
        }
      }
    );
    rfidLineBuffer = '';
    currentRfidPort.on('data', (data) => {
      const win = getRfidWindow();
      if (!win) return;
      rfidLineBuffer += data.toString();
      const lines = rfidLineBuffer.split(/\r?\n/);
      rfidLineBuffer = lines.pop() || '';
      lines.forEach((line) => {
        const tag = line.trim();
        if (tag.length > 0) win.send('rfid:tag', { tag });
      });
    });
    currentRfidPort.on('close', () => {
      currentRfidPort = null;
      rfidLineBuffer = '';
    });
    currentRfidPort.on('error', (err) => {
      const win = getRfidWindow();
      if (win) win.send('rfid:error', { error: err.message });
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('rfid:stop', async () => {
  try {
    if (currentRfidPort) {
      return new Promise((resolve) => {
        currentRfidPort.close((err) => {
          currentRfidPort = null;
          rfidLineBuffer = '';
          resolve({ ok: true, error: err ? err.message : null });
        });
      });
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

app.on('ready', () => {
  createWindow();
  if (app.isPackaged) {
    try {
      const { autoUpdater } = require('electron-updater');
      autoUpdater.autoDownload = true;
      autoUpdater.autoInstallOnAppQuit = true;
      autoUpdater.checkForUpdatesAndNotify().catch(() => {});
    } catch (_) {}
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

