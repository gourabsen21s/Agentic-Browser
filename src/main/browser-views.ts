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
  // No left gutter; sidebar floats as an overlay in renderer
  private leftGutterWidth = 0; // px

  constructor(window: BrowserWindow) {
    this.window = window;
    this.window.on('resize', () => this.layoutActiveView());
  }

  setTopChromeHeight(height: number) {
    this.topChromeHeight = Math.max(0, Math.floor(height));
    this.layoutActiveView();
  }

  private createView(url: string): BrowserView {
    const view = new BrowserView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        spellcheck: true,
      },
    });
    view.setAutoResize({ width: true, height: true });
    return view;
  }

  private attach(view: BrowserView) {
    if (!this.window.getBrowserView() || this.window.getBrowserView() !== view) {
      // Remove any existing view first
      const current = this.window.getBrowserView();
      if (current) this.window.removeBrowserView(current);
      this.window.addBrowserView(view);
      this.layoutActiveView();
    }
  }

  private boundsBelowChrome(): Rectangle {
    const { width, height } = this.window.getContentBounds();
    const y = this.topChromeHeight;
    const h = Math.max(0, height - this.topChromeHeight);
    const x = Math.max(0, this.leftGutterWidth);
    const w = Math.max(0, width - x);
    return { x, y, width: w, height: h };
  }

  private layoutActiveView() {
    if (!this.activeTabId) return;
    const entry = this.tabs.get(this.activeTabId);
    if (!entry) return;
    const bounds = this.boundsBelowChrome();
    entry.view.setBounds(bounds);
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
    const entry = this.tabs.get(id);
    if (!entry) return false;
    this.activeTabId = id;
    this.attach(entry.view);
    return true;
  }

  async closeTab(id: TabId): Promise<{ nextActiveId: TabId | null }> {
    const entry = this.tabs.get(id);
    if (!entry) return { nextActiveId: this.activeTabId };

    const wasActive = this.activeTabId === id;
    this.tabs.delete(id);

    try { this.window.removeBrowserView(entry.view); } catch { /* ignore */ }

    if (wasActive) {
      const next = Array.from(this.tabs.keys())[0] || null;
      this.activeTabId = next;
      if (next) {
        const n = this.tabs.get(next)!;
        this.attach(n.view);
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
