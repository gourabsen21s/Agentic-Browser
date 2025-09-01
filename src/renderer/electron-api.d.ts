// Type definitions for Electron API exposed to renderer process

export interface TabResult {
  success: boolean;
  tabId?: string;
  url?: string;
  nextActiveId?: string | null;
  error?: string;
}

export interface NavigationResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface WindowResult {
  success: boolean;
  maximized?: boolean;
  error?: string;
}

export interface WindowState {
  success: boolean;
  state?: {
    isMaximized: boolean;
    isMinimized: boolean;
    isFullScreen: boolean;
    bounds: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  error?: string;
}

export interface LayoutResult {
  success: boolean;
  error?: string;
}

export interface BookmarkResult {
  success: boolean;
  bookmark?: {
    id: string;
    title: string;
    url: string;
    favicon?: string;
    dateAdded: number;
  };
  bookmarks?: Array<{
    id: string;
    title: string;
    url: string;
    favicon?: string;
    dateAdded: number;
  }>;
  error?: string;
}

export interface SettingsResult {
  success: boolean;
  value?: any;
  settings?: any;
  error?: string;
}

export interface HistoryResult {
  success: boolean;
  history?: Array<{
    url: string;
    title: string;
    timestamp: number;
  }>;
  error?: string;
}

export interface DownloadsResult {
  success: boolean;
  downloads?: Array<any>;
  error?: string;
}

export interface TabUpdatePayload {
  tabId: string;
  title?: string;
  url?: string;
  favicon?: string | null;
  isLoading?: boolean;
}

export interface ElectronAPI {
  // Tab management
  createTab: (url?: string) => Promise<TabResult>;
  closeTab: (tabId: string) => Promise<TabResult>;
  switchTab: (tabId: string) => Promise<TabResult>;
  
  // Navigation
  navigate: (url: string) => Promise<NavigationResult>;
  goBack: () => Promise<NavigationResult>;
  goForward: () => Promise<NavigationResult>;
  reload: () => Promise<NavigationResult>;
  
  // Window controls
  minimize: () => Promise<WindowResult>;
  maximize: () => Promise<WindowResult>;
  close: () => Promise<WindowResult>;
  getWindowState: () => Promise<WindowState>;
  
  // Layout
  setChromeHeight: (height: number) => Promise<LayoutResult>;
  setSidebarWidth: (width: number) => Promise<LayoutResult>;
  
  // Bookmarks
  getBookmarks: () => Promise<BookmarkResult>;
  addBookmark: (bookmark: { title: string; url: string; favicon?: string }) => Promise<BookmarkResult>;
  removeBookmark: (url: string) => Promise<BookmarkResult>;
  updateBookmark: (id: string, updates: any) => Promise<BookmarkResult>;
  
  // Settings
  getSettings: (key?: string) => Promise<SettingsResult>;
  setSetting: (key: string, value: any) => Promise<SettingsResult>;
  updateSettings: (settings: any) => Promise<SettingsResult>;
  
  // History
  getHistory: (limit?: number) => Promise<HistoryResult>;
  addHistory: (entry: { url: string; title: string; timestamp: number }) => Promise<HistoryResult>;
  clearHistory: () => Promise<HistoryResult>;
  
  // Downloads
  getDownloads: () => Promise<DownloadsResult>;
  
  // Developer tools
  toggleDevTools: () => Promise<{ success: boolean; error?: string }>;
  
  // Event listeners
  onTabUpdated: (callback: (payload: TabUpdatePayload) => void) => void;
  removeTabUpdatedListeners: () => void;
  onTabSwitched: (callback: (payload: { tabId: string }) => void) => void;
  removeTabSwitchedListeners: () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
