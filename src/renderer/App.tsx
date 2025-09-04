import React, { useEffect, useRef, useCallback, useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, GlobalStyles } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import TabBar from './components/TabBar';
import NavigationBar from './components/NavigationBar';
import Homepage from './components/Homepage';
import FindOverlay, { FindOptions, FindResults } from './components/FindOverlay';
import SettingsPanel from './components/SettingsPanel';
import ChatInterface from './components/ChatInterface';
// WebviewContainer removed - BrowserView handles rendering directly
import { AppShortcut } from './types';
import { useBrowserState } from './hooks/useBrowserState';
import { useGestureNavigation } from './hooks/useGestureNavigation';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useSettings } from './hooks/useSettings';

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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [findResults, setFindResults] = useState<FindResults | undefined>();
  
  const chromeRef = useRef<HTMLDivElement | null>(null);
  const lastChromeHeight = useRef<number>(0);
  const navigationBarRef = useRef<{ focusAddressBar: () => void }>(null);
  
  const { settings } = useSettings();

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

  const handleBack = async () => {
    await window.electronAPI?.goBack?.();
  };

  const handleForward = async () => {
    await window.electronAPI?.goForward?.();
  };

  const handleReload = async () => {
    await window.electronAPI?.reload?.();
  };

  const handleNextTab = useCallback(() => {
    if (tabs.length <= 1) return;
    const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
    const nextIndex = (currentIndex + 1) % tabs.length;
    switchTab(tabs[nextIndex].id);
  }, [tabs, activeTabId, switchTab]);

  const handlePrevTab = useCallback(() => {
    if (tabs.length <= 1) return;
    const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
    const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
    switchTab(tabs[prevIndex].id);
  }, [tabs, activeTabId, switchTab]);

  const handleFocusAddressBar = useCallback(() => {
    navigationBarRef.current?.focusAddressBar?.();
  }, []);

  const handleHome = useCallback(() => {
    if (activeTabId) {
      navigateToUrl('https://www.google.com');
    } else {
      createTab('https://www.google.com');
    }
  }, [activeTabId, navigateToUrl, createTab]);

  const toggleChat = useCallback(() => {
    setIsChatOpen(prev => !prev);
  }, []);

  const toggleFind = useCallback(() => {
    setIsFindOpen(prev => !prev);
    if (isFindOpen) {
      // Stop find when closing
      window.electronAPI?.stopFindInPage?.();
      setFindResults(undefined);
    }
  }, [isFindOpen]);

  const toggleSettings = useCallback(() => {
    setIsSettingsOpen(prev => !prev);
  }, []);

  const handleFind = useCallback(async (query: string, options: FindOptions) => {
    if (!query.trim()) {
      setFindResults(undefined);
      return;
    }
    
    try {
      const result = await window.electronAPI?.findInPage?.(query, options);
      if (result?.success) {
        // Simulate find results for now - in real implementation this would come from IPC events
        setFindResults({
          activeMatchOrdinal: 1,
          matches: Math.floor(Math.random() * 10) + 1 // Random for demo
        });
      }
    } catch (error) {
      console.error('Find failed:', error);
      setFindResults({
        activeMatchOrdinal: 0,
        matches: 0
      });
    }
  }, []);

  const handleFindNext = useCallback(async () => {
    try {
      await window.electronAPI?.findNext?.();
    } catch (error) {
      console.error('Find next failed:', error);
    }
  }, []);

  const handleFindPrevious = useCallback(async () => {
    try {
      await window.electronAPI?.findPrevious?.();
    } catch (error) {
      console.error('Find previous failed:', error);
    }
  }, []);

  const handleDevTools = useCallback(async () => {
    try {
      await window.electronAPI?.devtools?.();
    } catch (error) {
      console.error('DevTools toggle failed:', error);
    }
  }, []);

  const handleSwitchToTab = useCallback((index: number) => {
    if (index >= 0 && index < tabs.length) {
      switchTab(tabs[index].id);
    }
  }, [tabs, switchTab]);

  // Gesture navigation callbacks
  const gestureCallbacks = {
    // Single finger gestures
    onSwipeLeft: handleNextTab,
    onSwipeRight: handlePrevTab,
    onSwipeUp: () => {
      if (tabs.length === 0) {
        createTab();
      }
    },
    onSwipeDown: toggleChat,
    
    // Two finger gestures
    onTwoFingerSwipeLeft: () => {
      console.log('Two finger swipe left - previous page');
      handleBack();
    },
    onTwoFingerSwipeRight: () => {
      console.log('Two finger swipe right - next page');
      handleForward();
    },
    onTwoFingerSwipeUp: () => {
      console.log('Two finger swipe up - new tab');
      createTab();
    },
    onTwoFingerSwipeDown: () => {
      console.log('Two finger swipe down - close tab');
      if (activeTabId) {
        closeTab(activeTabId);
      }
    },
    
    // Three finger gestures
    onThreeFingerSwipeLeft: () => {
      console.log('Three finger swipe left - show all tabs');
      // Could implement tab overview
    },
    onThreeFingerSwipeRight: () => {
      console.log('Three finger swipe right - hide all tabs');
      // Could implement minimize
    },
    onThreeFingerSwipeUp: () => {
      console.log('Three finger swipe up - show settings');
      toggleSettings();
    },
    onThreeFingerSwipeDown: () => {
      console.log('Three finger swipe down - show find');
      toggleFind();
    },
    
    // Advanced gestures
    onLongPress: (x: number, y: number) => {
      console.log(`Long press at ${x}, ${y} - show context menu`);
      // Could implement context menu
    },
    onDoubleTap: (x: number, y: number) => {
      console.log(`Double tap at ${x}, ${y} - zoom or reload`);
      handleReload();
    },
    onPinchIn: () => {
      console.log('Pinch in - zoom out');
      // Could implement zoom
    },
    onPinchOut: () => {
      console.log('Pinch out - zoom in');
      // Could implement zoom
    },
    onRotate: (angle: number) => {
      console.log(`Rotate gesture - angle: ${angle}`);
      // Could implement rotation actions
    }
  };

  // Keyboard shortcuts callbacks
  const keyboardCallbacks = {
    onNewTab: () => createTab(),
    onCloseTab: () => {
      if (activeTabId) {
        closeTab(activeTabId);
      }
    },
    onNextTab: handleNextTab,
    onPrevTab: handlePrevTab,
    onRefresh: handleReload,
    onBack: handleBack,
    onForward: handleForward,
    onFocusAddressBar: () => navigationBarRef.current?.focusAddressBar(),
    onFind: toggleFind,
    onDevTools: handleDevTools,
    onZoomIn: () => {
      // TODO: Implement zoom functionality
      console.log('Zoom in functionality not implemented yet');
    },
    onZoomOut: () => {
      // TODO: Implement zoom functionality
      console.log('Zoom out functionality not implemented yet');
    },
    onZoomReset: () => {
      // TODO: Implement zoom functionality
      console.log('Zoom reset functionality not implemented yet');
    },
    onHome: handleHome,
    onToggleChat: toggleChat,
    onToggleSettings: toggleSettings,
    onSwitchToTab: handleSwitchToTab,
  };

  // Initialize gesture navigation (only if enabled in settings)
  useGestureNavigation(settings.enableGestures ? gestureCallbacks : {});

  // Initialize keyboard shortcuts
  useKeyboardShortcuts(keyboardCallbacks, settings.shortcuts);

  // Handle global shortcuts from main process
  useEffect(() => {
    const handleGlobalShortcut = (action: string) => {
      console.log('Global shortcut triggered:', action);
      
      switch (action) {
        case 'new-tab':
          createTab();
          break;
        case 'close-tab':
          if (activeTabId) {
            closeTab(activeTabId);
          }
          break;
        case 'next-tab':
          handleNextTab();
          break;
        case 'prev-tab':
          handlePrevTab();
          break;
        case 'refresh':
          handleReload();
          break;
        case 'back':
          handleBack();
          break;
        case 'forward':
          handleForward();
          break;
        case 'focus-address':
          navigationBarRef.current?.focusAddressBar();
          break;
        case 'find':
          toggleFind();
          break;
        case 'devtools':
          handleDevTools();
          break;
        case 'home':
          handleHome();
          break;
        case 'toggle-chat':
          toggleChat();
          break;
        case 'toggle-settings':
          toggleSettings();
          break;
        case 'tab-1':
        case 'tab-2':
        case 'tab-3':
        case 'tab-4':
        case 'tab-5':
        case 'tab-6':
        case 'tab-7':
        case 'tab-8':
        case 'tab-9':
          const tabIndex = parseInt(action.split('-')[1]) - 1;
          handleSwitchToTab(tabIndex);
          break;
        default:
          console.log('Unhandled global shortcut:', action);
      }
    };

    // Listen for global shortcuts
    window.electronAPI?.onShortcut?.(handleGlobalShortcut);

    return () => {
      window.electronAPI?.removeShortcutListeners?.();
    };
  }, [createTab, closeTab, activeTabId, handleNextTab, handlePrevTab, handleReload, handleBack, handleForward, toggleFind, handleDevTools, handleHome, toggleChat, toggleSettings, handleSwitchToTab]);

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
          <Sidebar 
            shortcuts={shortcuts} 
            onShortcutClick={handleShortcutClick}
            onToggleChat={toggleChat}
            isChatOpen={isChatOpen}
            onToggleSettings={toggleSettings}
          />

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
              marginLeft: '70px', // Account for static sidebar width
              marginRight: isChatOpen ? '400px' : '0', // Account for chat interface width
              transition: 'margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
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
                ref={navigationBarRef}
                activeTab={activeTab}
                onNavigate={handleNavigate}
                onBack={handleBack}
                onForward={handleForward}
                onReload={handleReload}
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
          
          {/* Chat Interface */}
          <AnimatePresence>
            {isChatOpen && (
              <ChatInterface
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
              />
            )}
          </AnimatePresence>

          {/* Find Overlay */}
          <FindOverlay
            isOpen={isFindOpen}
            onClose={() => setIsFindOpen(false)}
            onFind={handleFind}
            onFindNext={handleFindNext}
            onFindPrevious={handleFindPrevious}
            findResults={findResults}
          />

          {/* Settings Panel */}
          <SettingsPanel
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
          />
          
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
