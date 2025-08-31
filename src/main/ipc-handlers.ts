import { ipcMain, BrowserWindow } from 'electron';
import { BrowserViewManager } from './browser-views';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Storage paths
const userDataPath = path.join(os.homedir(), '.BROWSER-MVP');
const settingsPath = path.join(userDataPath, 'settings.json');
const bookmarksPath = path.join(userDataPath, 'bookmarks.json');

// Ensure user data directory exists
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

// Default settings
const defaultSettings = {
  homepage: 'https://www.google.com',
  searchEngine: 'https://www.google.com/search?q=',
  userAgent: '',
  openBookmarksInNewTab: false,
  theme: 'light'
};

// Helper functions
function loadSettings(): any {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      return { ...defaultSettings, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  return defaultSettings;
}

function saveSettings(settings: any): void {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

function loadBookmarks(): any[] {
  try {
    if (fs.existsSync(bookmarksPath)) {
      const data = fs.readFileSync(bookmarksPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading bookmarks:', error);
  }
  return [];
}

function saveBookmarks(bookmarks: any[]): void {
  try {
    fs.writeFileSync(bookmarksPath, JSON.stringify(bookmarks, null, 2));
  } catch (error) {
    console.error('Error saving bookmarks:', error);
  }
}

export function setupIPC(viewManager: BrowserViewManager): void {
  // Browser navigation handlers
  ipcMain.handle('browser:navigate', async (event, url: string) => {
    try {
      // Validate URL
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (url.includes('.') && !url.includes(' ')) {
          url = 'https://' + url;
        } else {
          const settings = loadSettings();
          url = settings.searchEngine + encodeURIComponent(url);
        }
      }
      await viewManager.navigate(url);
      return { success: true, url };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle('browser:back', async (event) => {
    const ok = viewManager.back();
    return { success: ok };
  });

  ipcMain.handle('browser:forward', async (event) => {
    const ok = viewManager.forward();
    return { success: ok };
  });

  ipcMain.handle('browser:reload', async (event) => {
    const ok = viewManager.reload();
    return { success: ok };
  });

  // Tab management handlers
  ipcMain.handle('tab:create', async (event, url?: string) => {
    const settings = loadSettings();
    const tabUrl = url || settings.homepage;
    const created = await viewManager.createTab(tabUrl);
    return { success: true, tabId: created.id, url: created.url };
  });

  ipcMain.handle('tab:close', async (event, tabId: string) => {
    const result = await viewManager.closeTab(tabId);
    return { success: true, tabId, nextActiveId: result.nextActiveId };
  });

  ipcMain.handle('tab:switch', async (event, tabId: string) => {
    const ok = await viewManager.switchTab(tabId);
    return { success: ok, tabId };
  });

  ipcMain.handle('tab:update-title', async (event, tabId: string, title: string) => {
    return { success: true, tabId, title };
  });

  // Settings management handlers
  ipcMain.handle('settings:get', async (event, key?: string) => {
    try {
      const settings = loadSettings();
      if (key) {
        return { success: true, value: settings[key] };
      }
      return { success: true, value: settings };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle('settings:set', async (event, key: string, value: any) => {
    try {
      const settings = loadSettings();
      settings[key] = value;
      saveSettings(settings);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle('settings:update', async (event, newSettings: any) => {
    try {
      const currentSettings = loadSettings();
      const updatedSettings = { ...currentSettings, ...newSettings };
      saveSettings(updatedSettings);
      return { success: true, settings: updatedSettings };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  });

  // Bookmarks management handlers
  ipcMain.handle('bookmarks:get', async (event) => {
    try {
      const bookmarks = loadBookmarks();
      return { success: true, bookmarks };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage, bookmarks: [] };
    }
  });

  ipcMain.handle('bookmarks:add', async (event, bookmark: { title: string; url: string; favicon?: string }) => {
    try {
      const bookmarks = loadBookmarks();
      
      // Check if bookmark already exists
      const exists = bookmarks.some(b => b.url === bookmark.url);
      if (exists) {
        return { success: false, error: 'Bookmark already exists' };
      }

      const newBookmark = {
        ...bookmark,
        dateAdded: Date.now(),
        id: `bookmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      bookmarks.push(newBookmark);
      saveBookmarks(bookmarks);
      
      return { success: true, bookmark: newBookmark };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle('bookmarks:remove', async (event, url: string) => {
    try {
      const bookmarks = loadBookmarks();
      const filteredBookmarks = bookmarks.filter(b => b.url !== url);
      
      if (filteredBookmarks.length === bookmarks.length) {
        return { success: false, error: 'Bookmark not found' };
      }

      saveBookmarks(filteredBookmarks);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle('bookmarks:update', async (event, id: string, updates: any) => {
    try {
      const bookmarks = loadBookmarks();
      const bookmarkIndex = bookmarks.findIndex(b => b.id === id);
      
      if (bookmarkIndex === -1) {
        return { success: false, error: 'Bookmark not found' };
      }

      bookmarks[bookmarkIndex] = { ...bookmarks[bookmarkIndex], ...updates };
      saveBookmarks(bookmarks);
      
      return { success: true, bookmark: bookmarks[bookmarkIndex] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  });

  // Window control handlers
  ipcMain.handle('window:minimize', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      window.minimize();
      return { success: true };
    }
    return { success: false, error: 'Window not found' };
  });

  ipcMain.handle('window:maximize', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
      return { success: true, maximized: window.isMaximized() };
    }
    return { success: false, error: 'Window not found' };
  });

  ipcMain.handle('window:close', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      window.close();
      return { success: true };
    }
    return { success: false, error: 'Window not found' };
  });

  ipcMain.handle('window:get-state', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      return {
        success: true,
        state: {
          isMaximized: window.isMaximized(),
          isMinimized: window.isMinimized(),
          isFullScreen: window.isFullScreen(),
          bounds: window.getBounds()
        }
      };
    }
    return { success: false, error: 'Window not found' };
  });

  // Layout: allow renderer to inform top chrome height for BrowserView layout
  ipcMain.handle('layout:set-chrome-height', async (event, height: number) => {
    try {
      viewManager.setTopChromeHeight(height || 0);
      return { success: true };
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  });


  // History management (future enhancement)
  ipcMain.handle('history:get', async (event, limit = 50) => {
    // Placeholder for history functionality
    return { success: true, history: [] };
  });

  ipcMain.handle('history:add', async (event, entry: { url: string; title: string; timestamp: number }) => {
    // Placeholder for history functionality
    return { success: true };
  });

  ipcMain.handle('history:clear', async (event) => {
    // Placeholder for history functionality
    return { success: true };
  });

  // Download management (future enhancement)
  ipcMain.handle('downloads:get', async (event) => {
    // Placeholder for downloads functionality
    return { success: true, downloads: [] };
  });

  // Developer tools
  ipcMain.handle('devtools:toggle', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      window.webContents.toggleDevTools();
      return { success: true };
    }
    return { success: false, error: 'Window not found' };
  });
}