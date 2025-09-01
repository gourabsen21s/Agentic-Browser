import { contextBridge, ipcRenderer } from 'electron';

// Define the API interface for type safety
interface ElectronAPI {
  // Browser navigation
  navigate: (url: string) => Promise<{ success: boolean; url: string }>;
  goBack: () => Promise<{ success: boolean }>;
  goForward: () => Promise<{ success: boolean }>;
  reload: () => Promise<{ success: boolean }>;

  // Tab management
  createTab: (url?: string) => Promise<{ success: boolean; tabId: string; url: string }>;
  closeTab: (tabId: string) => Promise<{ success: boolean; tabId: string; nextActiveId?: string | null }>;
  switchTab: (tabId: string) => Promise<{ success: boolean }>;

  // Settings
  getSetting: (key: string) => Promise<{ success: boolean; value: any }>;
  setSetting: (key: string, value: any) => Promise<{ success: boolean }>;

  // Bookmarks
  getBookmarks: () => Promise<{ success: boolean; bookmarks: Array<{ title: string; url: string }> }>;
  addBookmark: (bookmark: { title: string; url: string }) => Promise<{ success: boolean }>;
  removeBookmark: (url: string) => Promise<{ success: boolean }>;

  // Window controls
  minimizeWindow: () => Promise<{ success: boolean }>;
  maximizeWindow: () => Promise<{ success: boolean }>;
  closeWindow: () => Promise<{ success: boolean }>;

  // Layout helpers
  setChromeHeight: (height: number) => Promise<{ success: boolean }>;
  setSidebarWidth: (width: number) => Promise<{ success: boolean }>;

  // Menu events (from main to renderer)
  onMenuEvent: (callback: (event: string) => void) => void;
  removeMenuEventListener: () => void;

  // Tab metadata events (from main to renderer)
  onTabUpdated: (callback: (payload: { tabId: string; title?: string; url?: string; favicon?: string | null; isLoading?: boolean }) => void) => void;
  removeTabUpdatedListeners: () => void;
  onTabSwitched: (callback: (payload: { tabId: string }) => void) => void;
  removeTabSwitchedListeners: () => void;
}

// Create the secure API object
const electronAPI: ElectronAPI = {
  // Browser navigation methods
  navigate: (url: string) => ipcRenderer.invoke('browser:navigate', url),
  goBack: () => ipcRenderer.invoke('browser:back'),
  goForward: () => ipcRenderer.invoke('browser:forward'),
  reload: () => ipcRenderer.invoke('browser:reload'),

  // Tab management methods
  createTab: (url?: string) => ipcRenderer.invoke('tab:create', url),
  closeTab: (tabId: string) => ipcRenderer.invoke('tab:close', tabId),
  switchTab: (tabId: string) => ipcRenderer.invoke('tab:switch', tabId),

  // Settings methods
  getSetting: (key: string) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key: string, value: any) => ipcRenderer.invoke('settings:set', key, value),

  // Bookmarks methods
  getBookmarks: () => ipcRenderer.invoke('bookmarks:get'),
  addBookmark: (bookmark: { title: string; url: string }) => 
    ipcRenderer.invoke('bookmarks:add', bookmark),
  removeBookmark: (url: string) => ipcRenderer.invoke('bookmarks:remove', url),

  // Window control methods
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),

  // Layout helpers
  setChromeHeight: (height: number) => ipcRenderer.invoke('layout:set-chrome-height', height),
  setSidebarWidth: (width: number) => ipcRenderer.invoke('window:set-sidebar-width', width),

  // Menu event handling
  onMenuEvent: (callback: (event: string) => void) => {
    const handler = (_event: any, eventType: string) => callback(eventType);
    
    ipcRenderer.on('menu:new-tab', handler);
    ipcRenderer.on('menu:close-tab', handler);
    ipcRenderer.on('menu:back', handler);
    ipcRenderer.on('menu:forward', handler);
    ipcRenderer.on('menu:reload', handler);
  },

  removeMenuEventListener: () => {
    ipcRenderer.removeAllListeners('menu:new-tab');
    ipcRenderer.removeAllListeners('menu:close-tab');
    ipcRenderer.removeAllListeners('menu:back');
    ipcRenderer.removeAllListeners('menu:forward');
    ipcRenderer.removeAllListeners('menu:reload');
  },

  // Tab metadata event handling
  onTabUpdated: (callback: (payload: any) => void) => {
    ipcRenderer.on('tab:updated', (_, payload) => callback(payload));
  },
  
  removeTabUpdatedListeners: () => {
    ipcRenderer.removeAllListeners('tab:updated');
  },

  // Event listeners for tab switching
  onTabSwitched: (callback: (payload: { tabId: string }) => void) => {
    ipcRenderer.on('tab:switched', (_, payload) => callback(payload));
  },
  
  removeTabSwitchedListeners: () => {
    ipcRenderer.removeAllListeners('tab:switched');
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for global window object
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}