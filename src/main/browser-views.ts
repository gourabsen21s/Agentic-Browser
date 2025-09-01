import { BrowserView, BrowserWindow, Rectangle } from 'electron';

export type TabId = string;

interface TabEntry {
  id: TabId;
  view: BrowserView;
}

export class BrowserViewManager {
  private window: BrowserWindow;
  private tabs: Map<TabId, TabEntry> = new Map();
  private activeTabId: TabId | null = null;
  // Height reserved for app chrome (TabBar + NavigationBar). Adjust as needed or wire from renderer via IPC.
  private topChromeHeight = 96; // px
  // Width reserved for sidebar
  private sidebarWidth = 0; // px

  constructor(window: BrowserWindow) {
    this.window = window;
    this.window.on('resize', () => this.layoutActiveView());
  }

  setTopChromeHeight(height: number) {
    this.topChromeHeight = Math.max(0, Math.floor(height));
    this.layoutActiveView();
  }

  setSidebarWidth(width: number) {
    this.sidebarWidth = Math.max(0, Math.floor(width));
    this.layoutActiveView();
  }

  private createView(url: string): BrowserView {
    const view = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        partition: 'persist:main',
        backgroundThrottling: false,
        webgl: true,
        plugins: true,
        javascript: true,
        v8CacheOptions: 'code',
        enableWebSQL: false,
        allowRunningInsecureContent: false,
        experimentalFeatures: false,
        enableBlinkFeatures: 'LazyLoad,CSSGridLayout,CSSFlexbox',
        disableBlinkFeatures: 'AutomationControlled,WebComponentsV0',
        spellcheck: false,
        offscreen: false,
        additionalArguments: [
          '--enable-gpu-rasterization',
          '--enable-zero-copy',
          '--disable-background-timer-throttling',
          '--disable-renderer-backgrounding',
          '--disable-backgrounding-occluded-windows',
          '--disable-features=TranslateUI'
        ]
      }
    });
    view.setAutoResize({ width: true, height: true });
    // Preload optimization
    if (url) {
      view.webContents.loadURL(url);
    }
    return view;
  }

  private attach(view: BrowserView) {
    if (!this.window.getBrowserView() || this.window.getBrowserView() !== view) {
      // Remove any existing view first
      const current = this.window.getBrowserView();
      if (current) {
        try {
          this.window.removeBrowserView(current);
        } catch (e) {
          console.log('[DEBUG] Failed to remove BrowserView (already destroyed):', e);
        }
      }
      this.window.addBrowserView(view);
      this.layoutActiveView();
      // Focus the BrowserView to ensure it receives input
      view.webContents.focus();
    }
  }

  private boundsBelowChrome(): Rectangle {
    const { width, height } = this.window.getContentBounds();
    const y = this.topChromeHeight;
    const h = Math.max(0, height - this.topChromeHeight);
    const x = this.sidebarWidth;
    const w = Math.max(0, width - this.sidebarWidth);
    return { x, y, width: w, height: h };
  }

  private layoutActiveView() {
    if (!this.activeTabId) return;
    const entry = this.tabs.get(this.activeTabId);
    if (!entry) return;
    const bounds = this.boundsBelowChrome();
    entry.view.setBounds(bounds);
  }

  public handleWindowResize() {
    // Re-layout the active view when window is resized
    this.layoutActiveView();
  }

  async createTab(url: string): Promise<{ id: TabId; url: string }> {
    const id: TabId = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const view = this.createView(url);
    this.tabs.set(id, { id, view });
    // wire metadata events to renderer
    const wc = view.webContents;
    wc.on('page-title-updated', (_e, title) => {
      try { this.window.webContents.send('tab:updated', { tabId: id, title }); } catch {}
    });
    wc.on('page-favicon-updated', (_e, favicons: string[]) => {
      const favicon = Array.isArray(favicons) && favicons.length ? favicons[0] : null;
      try { this.window.webContents.send('tab:updated', { tabId: id, favicon }); } catch {}
    });
    wc.on('did-navigate', (_e, newUrl) => {
      try { this.window.webContents.send('tab:updated', { tabId: id, url: newUrl }); } catch {}
    });
    wc.on('did-start-loading', () => {
      try { this.window.webContents.send('tab:updated', { tabId: id, isLoading: true }); } catch {}
    });
    wc.on('did-stop-loading', () => {
      try { this.window.webContents.send('tab:updated', { tabId: id, isLoading: false }); } catch {}
    });
    // Attach immediately for smoothness and emit loading state early
    this.activeTabId = id;
    this.attach(view);
    try { this.window.webContents.send('tab:updated', { tabId: id, isLoading: true, url }); } catch {}
    // Fire-and-forget load
    void wc.loadURL(url);
    return { id, url };
  }

  async switchTab(id: TabId): Promise<boolean> {
    console.log('[DEBUG] switchTab called with id:', id);
    const entry = this.tabs.get(id);
    if (!entry) {
      console.log('[DEBUG] switchTab: entry not found for id:', id);
      return false;
    }
    this.activeTabId = id;
    console.log('[DEBUG] switchTab: attaching view for id:', id);
    this.attach(entry.view);
    // Notify renderer about tab switch
    try { 
      console.log('[DEBUG] switchTab: sending tab:switched event for id:', id);
      this.window.webContents.send('tab:switched', { tabId: id }); 
    } catch (e) {
      console.log('[DEBUG] switchTab: failed to send tab:switched event:', e);
    }
    return true;
  }

  async closeTab(id: TabId): Promise<{ nextActiveId: TabId | null }> {
    console.log('[DEBUG] closeTab called with id:', id);
    const entry = this.tabs.get(id);
    if (!entry) return { nextActiveId: this.activeTabId };

    const wasActive = this.activeTabId === id;
    console.log('[DEBUG] closeTab: wasActive =', wasActive);
    this.tabs.delete(id);

    // Properly cleanup the BrowserView and stop any media
    try { 
      const webContents = entry.view.webContents;
      
      // First, try to stop media via JavaScript
      try {
        console.log('[DEBUG] closeTab: executing media cleanup JavaScript');
        await webContents.executeJavaScript(`
          console.log('[DEBUG] Media cleanup script executing');
          // Stop all media elements
          const mediaElements = document.querySelectorAll('video, audio');
          console.log('[DEBUG] Found', mediaElements.length, 'media elements');
          mediaElements.forEach(media => {
            console.log('[DEBUG] Stopping media element:', media.tagName);
            media.pause();
            media.currentTime = 0;
            media.src = '';
            media.srcObject = null;
            media.load();
            media.remove();
          });
          
          // Stop Web Audio API contexts
          if (window.AudioContext || window.webkitAudioContext) {
            if (window.audioContexts) {
              console.log('[DEBUG] Closing audio contexts');
              window.audioContexts.forEach(ctx => ctx.close());
            }
          }
          
          // Stop any background audio from iframes
          const iframes = document.querySelectorAll('iframe');
          console.log('[DEBUG] Found', iframes.length, 'iframes');
          iframes.forEach(iframe => {
            try {
              iframe.contentWindow.postMessage('pause', '*');
            } catch(e) {}
          });
        `);
        console.log('[DEBUG] closeTab: media cleanup JavaScript completed');
      } catch (e) {
        console.log('[DEBUG] closeTab: media cleanup JavaScript failed:', e);
      }
      
      // Force stop by suspending the webContents
      webContents.audioMuted = true;
      
      // Navigate to blank page to force stop everything
      try {
        await webContents.loadURL('about:blank');
      } catch {}
      
      // Safely remove the BrowserView
      try {
        this.window.removeBrowserView(entry.view);
      } catch (e) {
        console.log('[DEBUG] Failed to remove BrowserView during closeTab:', e);
      }
    } catch { /* ignore */ }

    if (wasActive) {
      const next = Array.from(this.tabs.keys())[0] || null;
      this.activeTabId = next;
      if (next) {
        const n = this.tabs.get(next)!;
        this.attach(n.view);
        // Notify renderer about tab switch
        try { this.window.webContents.send('tab:switched', { tabId: next }); } catch {}
      } else {
        // No tabs remaining - remove any BrowserView from the window
        try {
          const currentView = this.window.getBrowserView();
          if (currentView) {
            this.window.removeBrowserView(currentView);
            console.log('[DEBUG] closeTab: removed BrowserView - no tabs remaining');
          }
        } catch (e) {
          console.log('[DEBUG] closeTab: failed to remove BrowserView when no tabs remain:', e);
        }
      }
    }

    return { nextActiveId: this.activeTabId };
  }

  async navigate(url: string): Promise<boolean> {
    const entry = this.getActive();
    if (!entry) return false;
    try { this.window.webContents.send('tab:updated', { tabId: this.activeTabId, isLoading: true, url }); } catch {}
    void entry.view.webContents.loadURL(url);
    return true;
  }

  back(): boolean {
    const entry = this.getActive();
    if (!entry) return false;
    const wc = entry.view.webContents;
    if (wc.canGoBack()) wc.goBack();
    return true;
  }

  forward(): boolean {
    const entry = this.getActive();
    if (!entry) return false;
    const wc = entry.view.webContents;
    if (wc.canGoForward()) wc.goForward();
    return true;
  }

  reload(): boolean {
    const entry = this.getActive();
    if (!entry) return false;
    entry.view.webContents.reload();
    return true;
  }

  getActive(): TabEntry | null {
    if (!this.activeTabId) return null;
    return this.tabs.get(this.activeTabId) || null;
  }
}
