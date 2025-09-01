import { useState, useEffect, useRef, useCallback } from 'react';
import { Tab } from '../types';

export interface BrowserState {
  tabs: Tab[];
  activeTabId: string | null;
  isLoading: boolean;
}

export interface BrowserActions {
  createTab: (url?: string) => Promise<void>;
  closeTab: (tabId: string) => Promise<void>;
  switchTab: (tabId: string) => Promise<void>;
  updateTab: (tabId: string, updates: Partial<Tab>) => void;
  navigateToUrl: (url: string) => Promise<void>;
  processUrlInput: (input: string) => string;
}

export const useBrowserState = (): [BrowserState, BrowserActions] => {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const tabCounter = useRef(0);

  // Initialize with no tabs - show homepage by default
  useEffect(() => {
    // Start with empty tabs array to show homepage
    setTabs([]);
    setActiveTabId(null);
  }, []);

  // Listen for tab metadata updates from main process
  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.onTabUpdated) return;
    
    const handler = (payload: { tabId: string; title?: string; url?: string; favicon?: string | null; isLoading?: boolean }) => {
      const { tabId, ...rest } = payload;
      updateTab(tabId, rest as Partial<Tab>);
    };
    
    api.onTabUpdated(handler);
    return () => {
      api.removeTabUpdatedListeners?.();
    };
  }, []);

  // Listen for tab switch events from main process
  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.onTabSwitched) return;
    
    const handler = (payload: { tabId: string }) => {
      console.log('[DEBUG] Renderer received tab:switched event for tabId:', payload.tabId);
      setActiveTabId(payload.tabId);
    };
    
    api.onTabSwitched(handler);
    return () => {
      api.removeTabSwitchedListeners?.();
    };
  }, []);

  const createTab = useCallback(async (url: string = 'https://www.google.com') => {
    try {
      const res = await window.electronAPI?.createTab?.(url);
      if (res?.success && res.tabId) {
        const tabId: string = res.tabId;
        const newTab: Tab = {
          id: tabId,
          title: 'New Tab',
          url: res.url || url,
          favicon: null,
          isActive: false,
          isLoading: false
        };
        setTabs(prevTabs => [...prevTabs, newTab]);
        setActiveTabId(tabId);
      }
    } catch (error) {
      console.error('Failed to create tab:', error);
    }
  }, []);

  const closeTab = useCallback(async (tabId: string) => {
    // Get current tab count before making any changes
    const currentTabCount = tabs.length;
    const isClosingActiveTab = activeTabId === tabId;
    
    try {
      const res = await window.electronAPI?.closeTab?.(tabId);
      
      if (res?.success) {
        // Update local state after successful main process operation
        setTabs(prevTabs => prevTabs.filter(tab => tab.id !== tabId));
        
        // Handle tab switching logic
        if (res.nextActiveId) {
          // Main process provided a next active tab
          setActiveTabId(res.nextActiveId);
        } else if (currentTabCount <= 1) {
          // This was the last tab, don't create a new one - show homepage
          setActiveTabId(null);
        } else if (isClosingActiveTab) {
          // Fallback: if we were closing the active tab but no nextActiveId provided
          // Wait for main process to determine the next active tab
          const remainingTabs = tabs.filter(tab => tab.id !== tabId);
          if (remainingTabs.length > 0) {
            setActiveTabId(remainingTabs[0].id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to close tab:', error);
    }
  }, [tabs, activeTabId, createTab]);

  const switchTab = useCallback(async (tabId: string) => {
    console.log('[DEBUG] switchTab called in renderer with tabId:', tabId);
    console.log('[DEBUG] Current activeTabId:', activeTabId);
    console.log('[DEBUG] Available electronAPI methods:', Object.keys(window.electronAPI || {}));
    try {
      const res = await window.electronAPI?.switchTab?.(tabId);
      console.log('[DEBUG] switchTab IPC response:', res);
      if (res?.success) {
        console.log('[DEBUG] Setting activeTabId to:', tabId);
        setActiveTabId(tabId);
      } else {
        console.log('[DEBUG] switchTab failed, response:', res);
      }
    } catch (error) {
      console.error('[DEBUG] switchTab error:', error);
    }
  }, [activeTabId]);

  const updateTab = useCallback((tabId: string, updates: Partial<Tab>) => {
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === tabId ? { ...tab, ...updates } : tab
      )
    );
  }, []);

  const processUrlInput = useCallback((input: string): string => {
    if (!input) return 'https://www.google.com';
    
    // Already has protocol
    if (input.startsWith('http://') || input.startsWith('https://') || input.startsWith('file://')) {
      return input;
    }
    
    // Check if it's a valid URL pattern
    const urlPattern = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;
    const localhostPattern = /^localhost(:\d+)?(\/.*)?$/;
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/.*)?$/;
    
    // Check for localhost or IP addresses
    if (localhostPattern.test(input) || ipPattern.test(input)) {
      return `http://${input}`;
    }
    
    // Check if it looks like a domain
    if (urlPattern.test(input)) {
      return `https://${input}`;
    }
    
    // If it contains spaces or doesn't look like a URL, treat as search
    if (input.includes(' ') || !input.includes('.')) {
      return `https://www.google.com/search?q=${encodeURIComponent(input)}`;
    }
    
    // Default to treating as domain with https
    return `https://${input}`;
  }, []);

  const navigateToUrl = useCallback(async (url: string) => {
    if (!activeTabId) return;
    
    try {
      const processedUrl = processUrlInput(url.trim());
      await window.electronAPI?.navigate?.(processedUrl);
      updateTab(activeTabId, { url: processedUrl, isLoading: false });
    } catch (error) {
      console.error('Failed to navigate:', error);
    }
  }, [activeTabId, processUrlInput, updateTab]);

  const state: BrowserState = {
    tabs,
    activeTabId,
    isLoading
  };

  const actions: BrowserActions = {
    createTab,
    closeTab,
    switchTab,
    updateTab,
    navigateToUrl,
    processUrlInput
  };

  return [state, actions];
};
