// main.js
// Electron main process. Creates the app window and exposes the database
// to the renderer through IPC handlers (invoked via preload.js).

const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const webServer = require('./web-server');

let mainWindow;
let queries; // loaded after app is ready, since db.js needs app.getPath()
let backupTo;
let restoreFrom;
let dailyBackupTimer;
let appSettings = {};
let reportWindows = {};

function createWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    icon: path.join(__dirname, 'icon.png'),
    backgroundColor: '#15171a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Uncomment while developing to open devtools automatically:
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(async () => {
  // db.js requires `app` to already be ready (for app.getPath('userData')).
  ({ queries, backupTo, restoreFrom } = require('./db'));
  appSettings = loadAppSettings();

  // Generate a persistent, unique subdomain for this machine if not set.
  // This guarantees the user gets the exact same cellular link URL on every single run.
  if (!appSettings.mobileSubdomain) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let suffix = '';
    for (let i = 0; i < 10; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    appSettings.mobileSubdomain = `gearhead-${suffix}`;
    saveAppSettings();
  }

  registerIpcHandlers();
  scheduleDailyBackup();
  createWindow();

  // Start the local web server so the app is accessible from phones.
  webServer.setQueries(queries);
  webServer.startServer(appSettings.mobileSubdomain).catch((err) => console.error('[web-server] Failed to start:', err));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', async () => {
  await webServer.stopServer();
});

function registerIpcHandlers() {
  // ---- service catalogue ----
  ipcMain.handle('catalog:list', () => queries.getServiceCatalog());
  ipcMain.handle('catalog:add', (e, { name, price }) => queries.addServiceCatalogItem(name, price));
  ipcMain.handle('catalog:update', (e, { id, name, price }) => queries.updateServiceCatalogItem(id, name, price));
  ipcMain.handle('catalog:delete', (e, id) => queries.deleteServiceCatalogItem(id));

  // ---- customers ----
  ipcMain.handle('customer:create', (e, payload) => queries.createCustomer(payload));
  ipcMain.handle('customer:find', (e, q) => queries.findCustomers(q));
  ipcMain.handle('customer:get', (e, id) => queries.getCustomer(id));
  ipcMain.handle('customer:recent', (e, limit) => queries.listRecentCustomers(limit));
  ipcMain.handle('customer:list', () => queries.listCustomersWithStats());
  ipcMain.handle('customer:update', (e, payload) => queries.updateCustomer(payload));
  ipcMain.handle('customer:delete', (e, id) => queries.deleteCustomer(id));
  ipcMain.handle('customer:visits', (e, id) => queries.getCustomerVisitReport(id));
  ipcMain.handle('customer:openReport', (e, id) => openReportWindow(id));

  // ---- jobs ----
  ipcMain.handle('job:create', (e, payload) => queries.createJob(payload));
  ipcMain.handle('job:setItems', (e, { job_id, items }) => queries.setJobItems(job_id, items));
  ipcMain.handle('job:getItems', (e, job_id) => queries.getJobItems(job_id));
  ipcMain.handle('job:complete', (e, job_id) => queries.completeJobAndBill(job_id));
  ipcMain.handle('job:get', (e, job_id) => queries.getJob(job_id));
  ipcMain.handle('job:listActive', () => queries.listActiveJobs());
  ipcMain.handle('job:update', (e, payload) => queries.updateJob(payload));
  ipcMain.handle('job:delete', (e, job_id) => queries.deleteJob(job_id));

  // ---- bills ----
  ipcMain.handle('bill:getByJob', (e, job_id) => queries.getBillByJob(job_id));
  ipcMain.handle('bill:recent', (e, limit) => queries.listRecentBills(limit));

  // ---- reminders ----
  ipcMain.handle('reminders:list', () => queries.getReminders());

  // ---- reports ----
  ipcMain.handle('reports:get', () => queries.getReports());

  // ---- backup / restore ----
  ipcMain.handle('backup:create', async () => {
    const stamp = new Date().toISOString().slice(0, 10);
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Create Backup',
      defaultPath: `gearhead-backup-${stamp}.db`,
      filters: [{ name: 'Gearhead Backup', extensions: ['db'] }],
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    return { canceled: false, ...(await backupTo(result.filePath)) };
  });

  ipcMain.handle('backup:autoStatus', () => getAutoBackupStatus());

  ipcMain.handle('backup:chooseAutoDir', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Choose Auto Backup Folder',
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: getAutoBackupDir(),
    });
    if (result.canceled || !result.filePaths.length) return { canceled: true, ...getAutoBackupStatus() };

    appSettings.autoBackupDir = result.filePaths[0];
    saveAppSettings();
    const backup = await createAutoBackup();
    return { canceled: false, backup, ...getAutoBackupStatus() };
  });

  ipcMain.handle('backup:restore', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Restore Backup',
      properties: ['openFile'],
      filters: [{ name: 'Gearhead Backup', extensions: ['db'] }],
    });
    if (result.canceled || !result.filePaths.length) return { canceled: true };
    const restored = restoreFrom(result.filePaths[0]);
    dialog.showMessageBoxSync(mainWindow, {
      type: 'info',
      title: 'Backup Restored',
      message: 'Backup restored. The app will restart now.',
    });
    app.relaunch();
    app.exit(0);
    return { canceled: false, ...restored };
  });

  ipcMain.handle('phone:call', (e, mobile) => {
    const digits = String(mobile || '').replace(/[^\d+]/g, '');
    if (!digits) return false;
    shell.openExternal(`tel:${digits}`);
    return true;
  });

  // ---- web / mobile access ----
  ipcMain.handle('webserver:info', () => webServer.getServerInfo());

  ipcMain.handle('webserver:start', async () => {
    try {
      return await webServer.startServer(appSettings.mobileSubdomain);
    } catch (err) {
      return { running: false, error: String(err.message || err) };
    }
  });

  ipcMain.handle('webserver:stop', async () => {
    await webServer.stopServer();
    return webServer.getServerInfo();
  });
}

function scheduleDailyBackup() {
  createAutoBackup().catch((error) => console.error('Auto backup failed:', error));
  dailyBackupTimer = setInterval(() => {
    createAutoBackup().catch((error) => console.error('Auto backup failed:', error));
  }, 60 * 60 * 1000);
  dailyBackupTimer.unref?.();
}

async function createAutoBackup() {
  const backupDir = getAutoBackupDir();
  fs.mkdirSync(backupDir, { recursive: true });

  const today = getLocalDateStamp();
  const filePath = path.join(backupDir, `gearhead-auto-${today}.db`);
  if (fs.existsSync(filePath)) return { filePath, skipped: true };

  await backupTo(filePath);
  pruneAutoBackups(backupDir, 14);
  return { filePath, skipped: false };
}

function getAutoBackupDir() {
  return appSettings.autoBackupDir || path.join(app.getPath('userData'), 'daily-backups');
}

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function loadAppSettings() {
  const settingsPath = getSettingsPath();
  if (!fs.existsSync(settingsPath)) return {};

  try {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch (error) {
    console.error('Could not read settings:', error);
    return {};
  }
}

function saveAppSettings() {
  fs.mkdirSync(app.getPath('userData'), { recursive: true });
  fs.writeFileSync(getSettingsPath(), JSON.stringify(appSettings, null, 2));
}

function getLocalDateStamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getAutoBackupStatus() {
  const backupDir = getAutoBackupDir();
  if (!fs.existsSync(backupDir)) return { backupDir, latest: null, count: 0 };

  const files = getAutoBackupFiles(backupDir);
  return { backupDir, latest: files[0] || null, count: files.length };
}

function pruneAutoBackups(backupDir, keep) {
  getAutoBackupFiles(backupDir).slice(keep).forEach((file) => fs.unlinkSync(file.filePath));
}

function getAutoBackupFiles(backupDir) {
  return fs.readdirSync(backupDir)
    .filter((name) => /^gearhead-auto-\d{4}-\d{2}-\d{2}\.db$/.test(name))
    .map((name) => {
      const filePath = path.join(backupDir, name);
      return { name, filePath, mtimeMs: fs.statSync(filePath).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

function openReportWindow(id) {
  if (reportWindows[id]) {
    reportWindows[id].focus();
    return;
  }

  const reportWindow = new BrowserWindow({
    width: 800,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    icon: path.join(__dirname, 'icon.png'),
    backgroundColor: '#15171a',
    title: 'Customer Visit Report',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  reportWindows[id] = reportWindow;

  reportWindow.loadFile(path.join(__dirname, 'report.html'), { query: { id: id.toString() } });
  
  reportWindow.on('closed', () => {
    delete reportWindows[id];
  });
}

