import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, GlobalStyles } from '@mui/material';
import { motion } from 'framer-motion';
import Sidebar from './components/Sidebar';
import TabBar from './components/TabBar';
import NavigationBar from './components/NavigationBar';
import WebviewContainer from './components/WebviewContainer';
import { Tab, AppShortcut } from './types';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#1d4ed8',
    },
    secondary: {
      main: '#8b5cf6',
      light: '#a78bfa',
      dark: '#7c3aed',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
    },
    background: {
      default: '#0a0a0a',
      paper: 'rgba(15,15,15,0.95)',
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
    },
    divider: 'rgba(255, 255, 255, 0.08)',
  },
  typography: {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 500 },
    h6: { fontWeight: 500 },
    button: { fontWeight: 500, textTransform: 'none' },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: 'radial-gradient(ellipse at top, rgba(15,15,15,1) 0%, rgba(5,5,5,1) 100%)',
          minHeight: '100vh',
          fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
        '*': {
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.2) transparent',
        },
        '*::-webkit-scrollbar': {
          width: '6px',
          height: '6px',
        },
        '*::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '*::-webkit-scrollbar-thumb': {
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '3px',
          '&:hover': {
            background: 'rgba(255,255,255,0.3)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

const App: React.FC = () => {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const tabCounter = useRef(0);
  const chromeRef = useRef<HTMLDivElement | null>(null);
  const lastChromeHeight = useRef<number>(0);

  const reportChromeHeight = useCallback(() => {
    try {
      const el = chromeRef.current;
      if (!el) return;
      const chromeHeight = el.offsetHeight; // only tab/nav height counts toward top chrome
      if (chromeHeight !== lastChromeHeight.current) {
        lastChromeHeight.current = chromeHeight;
        (window as any).electronAPI?.setChromeHeight?.(chromeHeight);
      }
    } catch {}
  }, []);

  // No sidebar width reporting; layout is managed by top chrome height only.

  // Create initial tab on mount and observe chrome height changes
  useEffect(() => {
    const init = async () => {
      try {
        const res = await (window as any).electronAPI?.createTab?.('https://www.google.com');
        if (res?.success && res.tabId) {
          const tabId = res.tabId as string;
          const newTab: Tab = {
            id: tabId,
            title: 'New Tab',
            url: res.url || 'https://www.google.com',
            favicon: null,
            isActive: true,
            isLoading: false
          };
          setTabs([newTab]);
          setActiveTabId(tabId);
        }
      } catch {}
      reportChromeHeight();
    };

    let raf = 0;
    const schedule = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => reportChromeHeight());
    };

    const ro = new ResizeObserver(() => schedule());
    if (chromeRef.current) ro.observe(chromeRef.current);

    init();
    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [reportChromeHeight]);

  // Listen for tab metadata updates from main (title, url, favicon, loading)
  useEffect(() => {
    const api = (window as any).electronAPI;
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

  const createTab = async (url: string = 'https://www.google.com') => {
    const res = await (window as any).electronAPI?.createTab?.(url);
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
  };

  const closeTab = async (tabId: string) => {
    const res = await (window as any).electronAPI?.closeTab?.(tabId);
    setTabs(prevTabs => prevTabs.filter(tab => tab.id !== tabId));
    if (res?.success) {
      const nextId = res.nextActiveId as string | null | undefined;
      if (nextId) setActiveTabId(nextId);
      else if (tabs.length <= 1) {
        // No tabs left, create a fresh one
        setActiveTabId(null);
        setTimeout(() => { createTab(); }, 50);
      }
    }
  };

  const switchTab = async (tabId: string) => {
    const res = await (window as any).electronAPI?.switchTab?.(tabId);
    if (res?.success) setActiveTabId(tabId);
  };

  const updateTab = (tabId: string, updates: Partial<Tab>) => {
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === tabId ? { ...tab, ...updates } : tab
      )
    );
  };

  const navigateToUrl = async (url: string) => {
    if (!activeTabId) return;
    
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://')) {
      if (url.includes(' ') || (!url.includes('.') && !url.includes('localhost'))) {
        url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
      } else {
        url = `https://${url}`;
      }
    }

    await (window as any).electronAPI?.navigate?.(url);
    updateTab(activeTabId, { url, isLoading: false });
  };

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  const handleNavigate = (url: string) => {
    navigateToUrl(url);
  };

  const shortcuts: AppShortcut[] = [
    {
      id: 'google',
      name: 'Google',
      url: 'https://www.google.com',
      icon: 'https://www.google.com/favicon.ico',
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'youtube',
      name: 'YouTube',
      url: 'https://www.youtube.com',
      icon: 'https://www.youtube.com/favicon.ico',
      color: 'from-red-500 to-red-600'
    },
    {
      id: 'github',
      name: 'GitHub',
      url: 'https://www.github.com',
      icon: 'https://github.com/favicon.ico',
      color: 'from-gray-700 to-gray-800'
    },
    {
      id: 'twitter',
      name: 'Twitter',
      url: 'https://www.twitter.com',
      icon: 'https://twitter.com/favicon.ico',
      color: 'from-blue-400 to-blue-500'
    },
    {
      id: 'reddit',
      name: 'Reddit',
      url: 'https://www.reddit.com',
      icon: 'https://www.reddit.com/favicon.ico',
      color: 'from-orange-500 to-orange-600'
    }
  ];

  const handleShortcutClick = (url: string) => {
    createTab(url);
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <GlobalStyles
        styles={{
          '@keyframes pulse': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.5 },
          },
          '@keyframes fadeIn': {
            from: { opacity: 0, transform: 'translateY(10px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
          '.animate-fadeIn': {
            animation: 'fadeIn 0.3s ease-out',
          },
        }}
      />
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}
      >
        <Box sx={{ 
          display: 'flex', 
          height: '100vh', 
          width: '100vw', 
          overflow: 'hidden',
          background: 'radial-gradient(ellipse at top, rgba(15,15,15,1) 0%, rgba(5,5,5,1) 100%)',
          position: 'relative'
        }}>
          {/* Floating Sidebar */}
          <Sidebar shortcuts={shortcuts} onShortcutClick={handleShortcutClick} />

          {/* Main content area */}
          <Box 
            component="main" 
            sx={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              minHeight: 0,
              position: 'relative',
              zIndex: 1
            }}
          >
            <motion.div
              ref={chromeRef}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <TabBar 
                tabs={tabs}
                activeTabId={activeTabId}
                onSwitchTab={switchTab}
                onCloseTab={closeTab}
                onCreateTab={() => createTab()}
              />
              <NavigationBar 
                activeTab={activeTab}
                onNavigate={handleNavigate}
                onBack={async () => { await (window as any).electronAPI?.goBack?.(); }}
                onForward={async () => { await (window as any).electronAPI?.goForward?.(); }}
                onReload={async () => { await (window as any).electronAPI?.reload?.(); }}
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              style={{ flex: 1, minHeight: 0 }}
            >
              <WebviewContainer />
            </motion.div>
          </Box>
          
          {/* Background gradient overlay */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, rgba(59,130,246,0.02) 0%, rgba(139,92,246,0.02) 50%, rgba(6,182,212,0.02) 100%)',
              pointerEvents: 'none',
              zIndex: 0
            }}
          />
        </Box>
      </motion.div>
    </ThemeProvider>
  );
};

export default App;
