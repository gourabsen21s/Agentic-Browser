import { app, BrowserWindow, Menu, shell } from 'electron';
import * as path from 'path';
import { setupIPC } from './ipc-handlers';
import { BrowserViewManager } from './browser-views';
import { createApplicationMenu } from './menu';
import { setupShortcuts, ShortcutManager } from './shortcuts';

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;
let browserViewManager: BrowserViewManager | null = null;
let shortcutManager: ShortcutManager | null = null;

/**
 * Create the main browser window with security-first configuration
 */
export function createWindow(): BrowserWindow {
  // Create the browser window with modern security settings
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      // Security settings
      contextIsolation: true,           // Isolate context for security
      nodeIntegration: false,           // Disable Node.js in renderer
      webSecurity: true,                // Enable web security
      allowRunningInsecureContent: false,
      experimentalFeatures: false,

      // Preload script for secure IPC (built to dist/preload.js)
      preload: path.join(__dirname, 'preload.js'),
      
      // Additional security
      sandbox: true,
      spellcheck: true
    },
    
    // Window appearance
    show: false, // Don't show until ready-to-show
    backgroundColor: '#f8fafc',
    
    // macOS specific
    vibrancy: 'under-window',
    visualEffectState: 'active'
  });

  // Always load from built files (dist/renderer/index.html)
  const isDev = false;
  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
      
      // Focus window on creation
      if (isDev) {
        mainWindow.focus();
      }
    }
  });

  // Fix EventEmitter memory leak by increasing max listeners
  mainWindow.setMaxListeners(20);

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle window resize to update BrowserView bounds
  mainWindow.on('resize', () => {
    if (browserViewManager) {
      browserViewManager.handleWindowResize();
    }
  });

  // Security: Prevent new window creation
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open external links in default browser
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Security: Prevent navigation away from the app shell
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    // Only allow file:// renderer for the app shell
    if (parsedUrl.protocol !== 'file:') {
      event.preventDefault();
    }
  });
  return mainWindow;
}

/**
 * App event handlers
 */
app.whenReady().then(() => {
  // Create the main window
  const win = createWindow();

  // Initialize browser view manager
  if (win) {
    browserViewManager = new BrowserViewManager(win);
    setupIPC(browserViewManager);
    
    // Setup global shortcuts and store reference for IPC access
    shortcutManager = setupShortcuts(win);
    (win as any).shortcutManager = shortcutManager; // Store reference for IPC access
  }

  // Create application menu
  const menu = createApplicationMenu();
  Menu.setApplicationMenu(menu);

  // macOS: Re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation from renderer
app.on('web-contents-created', (event, contents) => {
  // Only constrain navigation for the main window, not BrowserViews
  if (contents.getType && contents.getType() === 'window') {
    contents.on('will-navigate', (event, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl);
      const isDev = !app.isPackaged;
      const devUrl = 'http://localhost:8060';
      // In dev, allow navigation to dev server origin; block others
      if (isDev && parsedUrl.origin !== devUrl) {
        event.preventDefault();
      }
    });
  }

  // Prevent new window creation everywhere
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
});

// Handle certificate errors
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    // In development, ignore certificate errors for localhost
    event.preventDefault();
    callback(true);
  } else {
    // In production, use default behavior
    callback(false);
  }
});

// Clean up on app quit
app.on('before-quit', () => {
  if (shortcutManager) {
    shortcutManager.unregisterAll();
  }
});

// Live reload is disabled to avoid bundling optional native deps.