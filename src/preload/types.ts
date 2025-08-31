// Shared types between main and renderer processes

export interface Tab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  isActive: boolean;
  isLoading: boolean;
}

export interface Bookmark {
  title: string;
  url: string;
  favicon?: string;
  dateAdded: number;
}

export interface BrowserSettings {
  homepage: string;
  searchEngine: string;
  userAgent?: string;
  openBookmarksInNewTab: boolean;
  theme: 'light' | 'dark' | 'system';
}

export interface NavigationState {
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  url: string;
  title: string;
}

// IPC Response types
export interface IPCResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Menu event types
export type MenuEvent = 
  | 'new-tab'
  | 'close-tab' 
  | 'back'
  | 'forward'
  | 'reload';