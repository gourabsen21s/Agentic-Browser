import React, { useEffect, useRef, useCallback } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, GlobalStyles } from '@mui/material';
import { motion } from 'framer-motion';
import Sidebar from './components/Sidebar';
import TabBar from './components/TabBar';
import NavigationBar from './components/NavigationBar';
import Homepage from './components/Homepage';
// WebviewContainer removed - BrowserView handles rendering directly
import { AppShortcut } from './types';
import { useBrowserState } from './hooks/useBrowserState';

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
  const [browserState, browserActions] = useBrowserState();
  const { tabs, activeTabId } = browserState;
  const { createTab, closeTab, switchTab, navigateToUrl } = browserActions;
  
  const chromeRef = useRef<HTMLDivElement | null>(null);
  const lastChromeHeight = useRef<number>(0);

  const reportChromeHeight = useCallback(() => {
    try {
      const el = chromeRef.current;
      if (!el) return;
      const chromeHeight = el.offsetHeight; // only tab/nav height counts toward top chrome
      if (chromeHeight !== lastChromeHeight.current) {
        lastChromeHeight.current = chromeHeight;
        window.electronAPI?.setChromeHeight?.(chromeHeight);
      }
    } catch {}
  }, []);

  // No sidebar width reporting; layout is managed by top chrome height only.

  // Observe chrome height changes
  useEffect(() => {
    reportChromeHeight();

    let raf = 0;
    const schedule = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => reportChromeHeight());
    };

    const ro = new ResizeObserver(() => schedule());
    if (chromeRef.current) ro.observe(chromeRef.current);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [reportChromeHeight]);







  const activeTab = tabs.find(tab => tab.id === activeTabId);

  const handleNavigate = (url: string) => {
    navigateToUrl(url);
  };

  const handleShortcutClick = (url: string) => {
    createTab(url);
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
          {/* Hover-based Sidebar */}
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
              zIndex: 1,
              marginLeft: '70px' // Account for static sidebar width
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
                onBack={async () => { await window.electronAPI?.goBack?.(); }}
                onForward={async () => { await window.electronAPI?.goForward?.(); }}
                onReload={async () => { await window.electronAPI?.reload?.(); }}
              />
            </motion.div>
            
            {/* Homepage when no tabs or BrowserView content */}
            {tabs.length === 0 ? (
              <Homepage 
                onNavigate={handleNavigate}
                onCreateTab={() => createTab()}
              />
            ) : null}
            {/* BrowserView renders content directly when tabs exist */}
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
