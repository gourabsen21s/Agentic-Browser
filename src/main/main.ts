import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron';
import * as path from 'path';
import * as isDev from 'electron-is-dev';


let mainWindow: BrowserWindow | null = null;

function createWindow():void {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences:{
            contextIsolation: true,
            nodeIntegration: false,
            webviewTag: true,
            webSecurity: true,
            allowRunningInsecureContent: false,
            experimentalFeatures: false,
            preload: path.join(__dirname, '../preload/preload.js'),
            sandbox: false,
            spellcheck: true
        },
        show: false,
        backgroundColor: '#f8fafc',
        vibrancy: 'under-window',
        visualEffectState: 'active'
    })

    if(isDev){
        mainWindow.loadURL("http://localhost:8080");
        mainWindow.webContents.openDevTools();
    }else{
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    mainWindow.once('ready-to-show',()=>{
        if(mainWindow){
            mainWindow.show();
        }
        if(isDev){
            mainWindow?.focus();
        }
    });

    mainWindow.on('closed',()=>{
        mainWindow= null;
    });

    mainWindow.webContents.setWindowOpenHandler(({url})=>{
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.webContents.on('will-navigate',(event, navigationURL)=>{
        const parsedURL = new URL(navigationURL);
        if(parsedURL.origin !== 'http://localhost:8080' && !isDev ){
            event.preventDefault();
        }
    });

};

function setupIPC(): void {

  ipcMain.handle('browser:navigate', async (event, url: string) => {
    return { success: true, url };
  });

  ipcMain.handle('browser:back', async (event) => {
    return { success: true };
  });

  ipcMain.handle('browser:forward', async (event) => {
    return { success: true };
  });

  ipcMain.handle('browser:reload', async (event) => {
    return { success: true };
  });


  ipcMain.handle('tab:create', async (event, url?: string) => {
    return { success: true, tabId: Date.now().toString() };
  });

  ipcMain.handle('tab:close', async (event, tabId: string) => {
    return { success: true };
  });

  ipcMain.handle('tab:switch', async (event, tabId: string) => {
    return { success: true };
  });


  ipcMain.handle('settings:get', async (event, key: string) => {

    return { success: true, value: null };
  });

  ipcMain.handle('settings:set', async (event, key: string, value: any) => {

    return { success: true };
  });


  ipcMain.handle('bookmarks:get', async (event) => {
    return { success: true, bookmarks: [] };
  });

  ipcMain.handle('bookmarks:add', async (event, bookmark: { title: string; url: string }) => {
    return { success: true };
  });

  ipcMain.handle('bookmarks:remove', async (event, url: string) => {
    return { success: true };
  });


  ipcMain.handle('window:minimize', async (event) => {
    if (mainWindow) {
      mainWindow.minimize();
    }
    return { success: true };
  });

  ipcMain.handle('window:maximize', async (event) => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
    return { success: true };
  });

  ipcMain.handle('window:close', async (event) => {
    if (mainWindow) {
      mainWindow.close();
    }
    return { success: true };
  });
};

function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Tab',
          accelerator: 'CmdOrCtrl+T',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:new-tab');
            }
          }
        },
        {
          label: 'Close Tab',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:close-tab');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Navigate',
      submenu: [
        {
          label: 'Back',
          accelerator: 'CmdOrCtrl+Left',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:back');
            }
          }
        },
        {
          label: 'Forward',
          accelerator: 'CmdOrCtrl+Right',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:forward');
            }
          }
        },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:reload');
            }
          }
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ];

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });

    (template[4].submenu as Electron.MenuItemConstructorOptions[]).push(
      { type: 'separator' },
      { role: 'front' },
      { type: 'separator' },
      { role: 'window' }
    );
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {

  createWindow();

  setupIPC();

  createMenu();
  

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});


app.on('window-all-closed', () => {

  if (process.platform !== 'darwin') {
    app.quit();
  }
});


app.on('web-contents-created', (event, contents) => {

  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== 'http://localhost:8080' && isDev) {
      event.preventDefault();
    }
  });


  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
});


app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (isDev) {

    event.preventDefault();
    callback(true);
  } else {

    callback(false);
  }
});


app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {

    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});


if (isDev) {
  try {
    require('electron-reloader')(module, {
      debug: true,
      watchRenderer: true
    });
  } catch (error) {
    console.log('Error loading electron-reloader:', error);
  }
}
