import { Browser, BrowserContext, chromium, Page, Cookie, Download, Frame, Request, Route } from 'playwright';
import { DOMService, ClickableElement, DomTreeResult } from './DOMService'; // Import DOMService and its interfaces
import * as fs from 'fs';
import * as path from 'path';

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private domService: DOMService | null = null; // Declare a property for DOMService

  private ensureBrowserComponents(component: 'browser' | 'context' | 'page' | 'domService'): void {
    if (component === 'browser' && !this.browser) {
      throw new Error('Browser is not launched. Call launch() first.');
    }
    if (component === 'context' && !this.context) {
      throw new Error('Browser context is not initialized. Call launch() first.');
    }
    if (component === 'page' && !this.page) {
      throw new Error('Page is not initialized. Call launch() or newTab() first.');
    }
    // New check for DOMService instance
    if (component === 'domService' && !this.domService) {
      throw new Error('DOMService is not initialized. Ensure a page is active (call launch(), newTab(), or switchToTab()).');
    }
  }

  async launch(headless = false): Promise<void> {
    try {
      this.browser = await chromium.launch({ headless });
      this.context = await this.browser.newContext({
        bypassCSP: true
      });
      this.page = await this.context.newPage();
      this.domService = new DOMService(this.page); // Initialize DOMService when page is created
      console.log(`Browser launched successfully in ${headless ? 'headless' : 'headful'} mode.`);
    } catch (error: any) {
      console.error('Failed to launch browser:', error);
      throw new Error(`Failed to launch browser: ${error.message || error}`);
    }
  }

  async goto(url: string): Promise<void> {
    this.ensureBrowserComponents('page');
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL provided for goto(). URL must be a non-empty string.');
    }
    try {
      await this.page!.goto(url, { waitUntil: 'domcontentloaded' });
      console.log(`Mapsd to: ${url}`);
    } catch (error: any) {
      console.error(`Failed to navigate to ${url}:`, error);
      throw new Error(`Failed to navigate to ${url}: ${error.message || error}`);
    }
  }

  async refresh(): Promise<void> {
    this.ensureBrowserComponents('page');
    try {
      await this.page!.reload();
      console.log('Page refreshed successfully.');
    } catch (error: any) {
      console.error('Failed to refresh page:', error);
      throw new Error(`Failed to refresh page: ${error.message || error}`);
    }
  }

  async goBack(): Promise<void> {
    this.ensureBrowserComponents('page');
    try {
      const response = await this.page!.goBack();
      if (response === null) {
        console.warn('Cannot go back: no previous history entry.');
      } else {
        console.log('Navigated back in history.');
      }
    } catch (error: any) {
      console.error('Failed to go back in history:', error);
      throw new Error(`Failed to go back in history: ${error.message || error}`);
    }
  }

  async goForward(): Promise<void> {
    this.ensureBrowserComponents('page');
    try {
      const response = await this.page!.goForward();
      if (response === null) {
        console.warn('Cannot go forward: no next history entry.');
      } else {
        console.log('Navigated forward in history.');
      }
    } catch (error: any) {
      console.error('Failed to go forward in history:', error);
      throw new Error(`Failed to go forward in history: ${error.message || error}`);
    }
  }

  async click(selector: string): Promise<void> {
    this.ensureBrowserComponents('page');
    if (!selector || typeof selector !== 'string') {
      throw new Error('Invalid selector provided for click(). Selector must be a non-empty string.');
    }
    try {
      await this.page!.click(selector);
      console.log(`Clicked element: ${selector}`);
    } catch (error: any) {
      console.error(`Failed to click element ${selector}:`, error);
      throw new Error(`Failed to click element ${selector}. It might not be visible or interactable: ${error.message || error}`);
    }
  }

  async type(selector: string, text: string): Promise<void> {
    this.ensureBrowserComponents('page');
    if (!selector || typeof selector !== 'string') {
      throw new Error('Invalid selector provided for type(). Selector must be a non-empty string.');
    }
    if (typeof text !== 'string') {
      throw new Error('Invalid text provided for type(). Text must be a string.');
    }
    try {
      await this.page!.fill(selector, text);
      console.log(`Typed into ${selector}: "${text}"`);
    } catch (error: any) {
      console.error(`Failed to type into element ${selector}:`, error);
      throw new Error(`Failed to type into element ${selector}. It might not be an input field or interactable: ${error.message || error}`);
    }
  }

  async extractText(selector: string): Promise<string | null> {
    this.ensureBrowserComponents('page');
    if (!selector || typeof selector !== 'string') {
      throw new Error('Invalid selector provided for extractText(). Selector must be a non-empty string.');
    }
    try {
      const text = await this.page!.textContent(selector);
      console.log(`Extracted text from ${selector}: "${text}"`);
      return text;
    } catch (error: any) {
      console.error(`Failed to extract text from element ${selector}:`, error);
      throw new Error(`Failed to extract text from element ${selector}: ${error.message || error}`);
    }
  }

  async screenshot(screenshotPath?: string, fullPage = false): Promise<string> {
    this.ensureBrowserComponents('page');
    if (screenshotPath && typeof screenshotPath !== 'string') {
      throw new Error('Invalid path provided for screenshot(). Path must be a string.');
    }
    try {
      const buffer = await this.page!.screenshot({ path: screenshotPath, fullPage });
      const base64 = buffer.toString('base64');
      console.log(`Screenshot ${screenshotPath ? `saved to ${screenshotPath}` : 'taken as base64'}.`);
      return base64;
    } catch (error: any) {
      console.error(`Failed to take screenshot${screenshotPath ? ` to ${screenshotPath}` : ''}:`, error);
      throw new Error(`Failed to take screenshot: ${error.message || error}`);
    }
  }

  // --- DOMService Delegated Methods ---

  // Renamed to avoid confusion with BrowserManager's internal getDomHtml if it existed
  async getPageDomHtml(): Promise<string> {
    this.ensureBrowserComponents('domService');
    return this.domService!.getDomHtml();
  }

  async getClickableElementsDetails(): Promise<ClickableElement[]> {
    this.ensureBrowserComponents('domService');
    return this.domService!.getClickableElements();
  }

  async highlightDomTreeElements(scriptPath: string, args: any = {}): Promise<void> {
    this.ensureBrowserComponents('domService');
    return this.domService!.highlightDomTree(scriptPath, args);
  }

  async getStructuredDomTree(scriptPath: string, args: any = {}): Promise<DomTreeResult | null> {
    this.ensureBrowserComponents('domService');
    return this.domService!.getStructuredDomTree(scriptPath, args);
  }

  async getElementDetailsByIndex(scriptPath: string, index: number, args: any = {}): Promise<any | null> {
    this.ensureBrowserComponents('domService');
    return this.domService!.getElementByIndex(scriptPath, index, args);
  }

  async getAllVisibleTextNodes(): Promise<{ text: string; parentSelector: string }[]> {
    this.ensureBrowserComponents('domService');
    return this.domService!.getAllVisibleTextNodes();
  }

  async removeHighlights(): Promise<void> {
    this.ensureBrowserComponents('domService');
    return this.domService!.removeHighlights();
  }

  // --- End DOMService Delegated Methods ---

  async waitForSelector(selector: string, timeout = 10000): Promise<void> {
    this.ensureBrowserComponents('page');
    if (!selector || typeof selector !== 'string') {
      throw new Error('Invalid selector provided for waitForSelector(). Selector must be a non-empty string.');
    }
    if (typeof timeout !== 'number' || timeout < 0) {
      throw new Error('Invalid timeout provided for waitForSelector(). Timeout must be a non-negative number.');
    }
    try {
      await this.page!.waitForSelector(selector, { timeout });
      console.log(`Selector ${selector} appeared within timeout.`);
    } catch (error: any) {
      console.error(`Failed to wait for selector ${selector}:`, error);
      throw new Error(`Failed to wait for selector ${selector}. It did not appear within ${timeout}ms: ${error.message || error}`);
    }
  }

  async evaluate<T>(fn: (...args: any[]) => T, ...args: any[]): Promise<T> {
    this.ensureBrowserComponents('page');
    if (typeof fn !== 'function') {
      throw new Error('Invalid function provided for evaluate(). Must be a function.');
    }
    try {
      const result = await this.page!.evaluate(fn, ...args);
      console.log('Evaluated function in page context.');
      return result;
    } catch (error: any) {
      console.error('Failed to evaluate function in page context:', error);
      throw new Error(`Failed to evaluate function in page context: ${error.message || error}`);
    }
  }

  async injectScriptFromFile(filePath: string): Promise<void> {
    this.ensureBrowserComponents('page');
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path provided for injectScriptFromFile(). Path must be a non-empty string.');
    }
    if (!fs.existsSync(filePath)) {
      throw new Error(`Script file not found: ${filePath}`);
    }
    try {
      const script = fs.readFileSync(filePath, 'utf8');
      await this.page!.addScriptTag({ content: script });
      console.log(`Script injected from file: ${filePath}`);
    } catch (error: any) {
      console.error(`Failed to inject script from file ${filePath}:`, error);
      throw new Error(`Failed to inject script from file ${filePath}: ${error.message || error}`);
    }
  }

  // Removed redundant DOM-related methods, as they are now handled by DOMService
  // async highlightElements(...) {} - REMOVED
  // async getAllClickableElements(...) {} - REMOVED


  async uploadFile(selector: string, filePath: string): Promise<void> {
    this.ensureBrowserComponents('page');
    if (!selector || typeof selector !== 'string') {
      throw new Error('Invalid selector provided for uploadFile(). Selector must be a non-empty string.');
    }
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path provided for uploadFile(). Path must be a non-empty string.');
    }
    if (!fs.existsSync(filePath)) {
      throw new Error(`File to upload not found: ${filePath}`);
    }
    try {
      const input = await this.page!.$(selector);
      if (!input) {
        throw new Error(`File input element not found for selector: ${selector}`);
      }
      await input.setInputFiles(filePath);
      console.log(`File ${filePath} uploaded to ${selector}.`);
    } catch (error: any) {
      console.error(`Failed to upload file ${filePath} to ${selector}:`, error);
      throw new Error(`Failed to upload file ${filePath} to ${selector}: ${error.message || error}`);
    }
  }

  async dragAndDrop(sourceSelector: string, targetSelector: string): Promise<void> {
    this.ensureBrowserComponents('page');
    if (!sourceSelector || typeof sourceSelector !== 'string') {
      throw new Error('Invalid source selector provided for dragAndDrop(). Selector must be a non-empty string.');
    }
    if (!targetSelector || typeof targetSelector !== 'string') {
      throw new Error('Invalid target selector provided for dragAndDrop(). Selector must be a non-empty string.');
    }
    try {
      await this.page!.dragAndDrop(sourceSelector, targetSelector);
      console.log(`Dragged from ${sourceSelector} to ${targetSelector}.`);
    } catch (error: any) {
      console.error(`Failed to drag and drop from ${sourceSelector} to ${targetSelector}:`, error);
      throw new Error(`Failed to drag and drop from ${sourceSelector} to ${targetSelector}: ${error.message || error}`);
    }
  }

  async newTab(url?: string): Promise<void> {
    this.ensureBrowserComponents('context');
    if (url && typeof url !== 'string') {
      throw new Error('Invalid URL provided for newTab(). URL must be a string.');
    }
    try {
      const newPage = await this.context!.newPage();
      this.page = newPage;
      this.domService = new DOMService(this.page); // Re-initialize DOMService for the new page
      if (url) {
        await this.page.goto(url);
        console.log(`New tab opened and navigated to: ${url}`);
      } else {
        console.log('New tab opened.');
      }
    } catch (error: any) {
      console.error('Failed to open a new tab:', error);
      throw new Error(`Failed to open a new tab: ${error.message || error}`);
    }
  }

  async switchToTab(index: number): Promise<void> {
    this.ensureBrowserComponents('context');
    if (typeof index !== 'number' || index < 0) {
      throw new Error('Invalid index provided for switchToTab(). Index must be a non-negative number.');
    }
    try {
      const pages = this.context!.pages();
      if (index >= pages.length) {
        throw new Error(`Tab index ${index} out of range. There are only ${pages.length} tabs open.`);
      }
      this.page = pages[index];
      this.domService = new DOMService(this.page); // Update DOMService to the switched page
      console.log(`Switched to tab at index: ${index}`);
    } catch (error: any) {
      console.error(`Failed to switch to tab at index ${index}:`, error);
      throw new Error(`Failed to switch to tab at index ${index}: ${error.message || error}`);
    }
  }

  async closeTab(index?: number): Promise<void> {
    this.ensureBrowserComponents('context');
    if (index !== undefined && (typeof index !== 'number' || index < 0)) {
      throw new Error('Invalid index provided for closeTab(). Index must be a non-negative number or undefined.');
    }

    try {
      const pages = this.context!.pages();
      let pageToClose: Page | null = null;

      if (index !== undefined) {
        if (index >= pages.length) {
          console.warn(`Attempted to close tab at index ${index}, but only ${pages.length} tabs are open.`);
          return;
        }
        pageToClose = pages[index];
      } else {
        if (this.page && pages.includes(this.page)) {
          pageToClose = this.page;
        } else if (pages.length > 0) {
          pageToClose = pages[pages.length - 1];
          console.warn('Current page not found in context pages, closing the last available tab.');
        }
      }

      if (pageToClose && !pageToClose.isClosed()) {
        await pageToClose.close();
        console.log(`Tab ${index !== undefined ? `at index ${index}` : 'current'} closed.`);
      } else if (pageToClose?.isClosed()) {
        console.log(`Tab ${index !== undefined ? `at index ${index}` : 'current'} was already closed.`);
      } else {
        console.warn('No active tab or specified tab to close.');
      }

      const remainingPages = this.context!.pages();
      if (remainingPages.length > 0) {
        this.page = remainingPages[0];
        this.domService = new DOMService(this.page); // Update DOMService to the new active page
        console.log('Switched to the first available tab.');
      } else {
        this.page = null;
        this.domService = null; // No page means no DOMService instance
        console.log('No tabs remaining in the context.');
      }
    } catch (error: any) {
      console.error(`Failed to close tab${index !== undefined ? ` at index ${index}` : ''}:`, error);
      throw new Error(`Failed to close tab: ${error.message || error}`);
    }
  }

  async handleDialog(accept = true, promptText?: string): Promise<void> {
    this.ensureBrowserComponents('page');
    if (typeof accept !== 'boolean') {
      throw new Error('Invalid "accept" value provided for handleDialog(). Must be a boolean.');
    }
    if (promptText !== undefined && typeof promptText !== 'string') {
      throw new Error('Invalid "promptText" provided for handleDialog(). Must be a string or undefined.');
    }
    try {
      this.page!.once('dialog', async dialog => {
        console.log(`Dialog of type "${dialog.type}" with message: "${dialog.message}" detected.`);
        if (accept) {
          await dialog.accept(promptText);
          console.log(`Dialog accepted${promptText ? ` with text: "${promptText}"` : ''}.`);
        } else {
          await dialog.dismiss();
          console.log('Dialog dismissed.');
        }
      });
    } catch (error: any) {
      console.error('Error setting up dialog handler:', error);
      throw new Error(`Error setting up dialog handler: ${error.message || error}`);
    }
  }

  async scrollTo(selector: string): Promise<void> {
    this.ensureBrowserComponents('page');
    if (!selector || typeof selector !== 'string') {
      throw new Error('Invalid selector provided for scrollTo(). Selector must be a non-empty string.');
    }
    try {
      await this.page!.waitForSelector(selector, { state: 'visible', timeout: 5000 });
      await this.page!.$eval(selector, el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      console.log(`Scrolled to element: ${selector}`);
    } catch (error: any) {
      console.error(`Failed to scroll to element ${selector}:`, error);
      throw new Error(`Failed to scroll to element ${selector}. Element might not be found or visible: ${error.message || error}`);
    }
  }

  async selectOption(selector: string, value: string | string[]): Promise<void> {
    this.ensureBrowserComponents('page');
    if (!selector || typeof selector !== 'string') {
      throw new Error('Invalid selector provided for selectOption(). Selector must be a non-empty string.');
    }
    if (!value || (typeof value !== 'string' && !Array.isArray(value))) {
      throw new Error('Invalid value provided for selectOption(). Value must be a string or an array of strings.');
    }
    try {
      const selectedValues = await this.page!.selectOption(selector, value);
      if (selectedValues.length === 0) {
        console.warn(`No option matched value "${value}" for selector "${selector}".`);
      } else {
        console.log(`Selected option(s) "${selectedValues.join(', ')}" in dropdown: ${selector}`);
      }
    } catch (error: any) {
      console.error(`Failed to select option "${value}" for selector ${selector}:`, error);
      throw new Error(`Failed to select option "${value}" for selector ${selector}. Selector might not be a dropdown or value not found: ${error.message || error}`);
    }
  }

  async extractAttribute(selector: string, attribute: string): Promise<string | null> {
    this.ensureBrowserComponents('page');
    if (!selector || typeof selector !== 'string') {
      throw new Error('Invalid selector provided for extractAttribute(). Selector must be a non-empty string.');
    }
    if (!attribute || typeof attribute !== 'string') {
      throw new Error('Invalid attribute provided for extractAttribute(). Attribute must be a non-empty string.');
    }
    try {
      const value = await this.page!.getAttribute(selector, attribute);
      if (value === null) {
        console.warn(`Attribute "${attribute}" not found on element ${selector} or element not found.`);
      } else {
        console.log(`Extracted attribute "${attribute}" from ${selector}: "${value}"`);
      }
      return value;
    } catch (error: any) {
      console.error(`Failed to extract attribute "${attribute}" from element ${selector}:`, error);
      throw new Error(`Failed to extract attribute "${attribute}" from element ${selector}: ${error.message || error}`);
    }
  }

  async getCookies(): Promise<Cookie[]> {
    this.ensureBrowserComponents('context');
    try {
      const cookies = await this.context!.cookies();
      console.log(`Retrieved ${cookies.length} cookies.`);
      return cookies;
    } catch (error: any) {
      console.error('Failed to get cookies:', error);
      throw new Error(`Failed to get cookies: ${error.message || error}`);
    }
  }

  async setCookie(cookie: Cookie): Promise<void> {
    this.ensureBrowserComponents('context');
    if (!cookie || typeof cookie !== 'object') {
      throw new Error('Invalid cookie object provided for setCookie(). Must be a valid Cookie object.');
    }
    if (!cookie.name || !cookie.value || (!cookie.domain && !cookie.path)) {
        console.warn('Cookie object might be incomplete. Recommended properties: name, value, and either domain or path (or both).');
    }
    try {
      await this.context!.addCookies([cookie]);
      console.log(`Cookie "${cookie.name}" set.`);
    } catch (error: any) {
      console.error(`Failed to set cookie "${cookie.name}":`, error);
      throw new Error(`Failed to set cookie "${cookie.name}": ${error.message || error}`);
    }
  }

  async clearCookies(): Promise<void> {
    this.ensureBrowserComponents('context');
    try {
      await this.context!.clearCookies();
      console.log('All cookies cleared.');
    } catch (error: any) {
      console.error('Failed to clear cookies:', error);
      throw new Error(`Failed to clear cookies: ${error.message || error}`);
    }
  }

  async getLocalStorage(key: string): Promise<string | null> {
    this.ensureBrowserComponents('page');
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid key provided for getLocalStorage(). Key must be a non-empty string.');
    }
    try {
      const value = await this.page!.evaluate((k) => localStorage.getItem(k), key);
      console.log(`Retrieved localStorage key "${key}": "${value}"`);
      return value;
    } catch (error: any) {
      console.error(`Failed to get localStorage for key "${key}":`, error);
      throw new Error(`Failed to get localStorage for key "${key}": ${error.message || error}`);
    }
  }

  async setLocalStorage(key: string, value: string): Promise<void> {
    this.ensureBrowserComponents('page');
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid key provided for setLocalStorage(). Key must be a non-empty string.');
    }
    if (typeof value !== 'string') {
      throw new Error('Invalid value provided for setLocalStorage(). Value must be a string.');
    }
    try {
      await this.page!.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value]);
      console.log(`Set localStorage key "${key}" to "${value}".`);
    } catch (error: any) {
      console.error(`Failed to set localStorage for key "${key}":`, error);
      throw new Error(`Failed to set localStorage for key "${key}": ${error.message || error}`);
    }
  }

  async clearLocalStorage(): Promise<void> {
    this.ensureBrowserComponents('page');
    try {
      await this.page!.evaluate(() => localStorage.clear());
      console.log('localStorage cleared.');
    } catch (error: any) {
      console.error('Failed to clear localStorage:', error);
      throw new Error(`Failed to clear localStorage: ${error.message || error}`);
    }
  }

  async clearSessionStorage(): Promise<void> {
    this.ensureBrowserComponents('page');
    try {
      await this.page!.evaluate(() => sessionStorage.clear());
      console.log('sessionStorage cleared.');
    } catch (error: any) {
      console.error('Failed to clear sessionStorage:', error);
      throw new Error(`Failed to clear sessionStorage: ${error.message || error}`);
    }
  }

  async downloadFile(selector: string, downloadPath: string): Promise<void> {
    this.ensureBrowserComponents('page');
    if (!selector || typeof selector !== 'string') {
      throw new Error('Invalid selector provided for downloadFile(). Selector must be a non-empty string.');
    }
    if (!downloadPath || typeof downloadPath !== 'string') {
      throw new Error('Invalid download path provided for downloadFile(). Path must be a non-empty string.');
    }

    try {
      const downloadDir = path.dirname(downloadPath);
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
        console.log(`Created download directory: ${downloadDir}`);
      }

      const [download] = await Promise.all([
        this.page!.waitForEvent('download', { timeout: 60000 }),
        this.page!.click(selector)
      ]);

      const suggestedFilename = download.suggestedFilename();
      const finalDownloadPath = path.join(downloadDir, suggestedFilename);

      await download.saveAs(finalDownloadPath);
      console.log(`File downloaded successfully to: ${finalDownloadPath}`);
    } catch (error: any) {
      console.error(`Failed to download file triggered by ${selector} to ${downloadPath}:`, error);
      throw new Error(`Failed to download file triggered by ${selector}: ${error.message || error}`);
    }
  }

  async interceptRequests(urlPattern: string | RegExp | ((url: URL) => boolean), handler: (route: Route, request: Request) => void): Promise<void> {
    this.ensureBrowserComponents('page');
    if (!urlPattern) {
      throw new Error('Invalid URL pattern provided for interceptRequests().');
    }
    if (typeof handler !== 'function') {
      throw new Error('Invalid handler function provided for interceptRequests().');
    }
    try {
      await this.page!.route(urlPattern, handler);
      console.log(`Request interception set up for pattern: ${urlPattern}.`);
    } catch (error: any) {
      console.error(`Failed to set up request interception for pattern ${urlPattern}:`, error);
      throw new Error(`Failed to set up request interception: ${error.message || error}`);
    }
  }

  async emulateDevice(deviceName: string): Promise<void> {
    this.ensureBrowserComponents('browser');
    if (!deviceName || typeof deviceName !== 'string') {
      throw new Error('Invalid device name provided for emulateDevice(). Name must be a non-empty string.');
    }
    try {
      const { devices } = require('playwright');
      const device = devices[deviceName];
      if (!device) {
        throw new Error(`Device "${deviceName}" not found in Playwright's device list.`);
      }
      if (this.context) {
        await this.context.close();
        console.log('Existing browser context closed for device emulation.');
      }
      this.context = await this.browser!.newContext({ ...device });
      this.page = await this.context.newPage();
      this.domService = new DOMService(this.page); // Re-initialize DOMService for the new page
      console.log(`Device "${deviceName}" emulated successfully.`);
    } catch (error: any) {
      console.error(`Failed to emulate device "${deviceName}":`, error);
      throw new Error(`Failed to emulate device "${deviceName}": ${error.message || error}`);
    }
  }

  async setUserAgent(userAgent: string): Promise<void> {
    this.ensureBrowserComponents('browser');
    if (!userAgent || typeof userAgent !== 'string') {
      throw new Error('Invalid user agent provided for setUserAgent(). Must be a non-empty string.');
    }
    try {
      if (this.context) {
        await this.context.close();
        console.log('Existing browser context closed for user agent change.');
      }
      this.context = await this.browser!.newContext({ userAgent });
      this.page = await this.context.newPage();
      this.domService = new DOMService(this.page); // Re-initialize DOMService for the new page
      console.log(`User agent set to: "${userAgent}".`);
    } catch (error: any) {
      console.error(`Failed to set user agent to "${userAgent}":`, error);
      throw new Error(`Failed to set user agent to "${userAgent}": ${error.message || error}`);
    }
  }

  async getFrameByNameOrURL(nameOrUrl: string): Promise<Frame | null> {
    this.ensureBrowserComponents('page');
    if (!nameOrUrl || typeof nameOrUrl !== 'string') {
      throw new Error('Invalid name or URL provided for getFrameByNameOrURL(). Must be a non-empty string.');
    }
    try {
      const frame = this.page!.frame({ name: nameOrUrl }) || this.page!.frame({ url: nameOrUrl });
      if (frame) {
        console.log(`Found frame by name/URL: ${nameOrUrl}.`);
      } else {
        console.warn(`Frame with name or URL "${nameOrUrl}" not found.`);
      }
      return frame;
    } catch (error: any) {
      console.error(`Failed to get frame by name or URL "${nameOrUrl}":`, error);
      throw new Error(`Failed to get frame by name or URL "${nameOrUrl}": ${error.message || error}`);
    }
  }

  async waitForNavigation(waitUntil: 'load' | 'domcontentloaded' | 'networkidle' = 'domcontentloaded'): Promise<void> {
    this.ensureBrowserComponents('page');
    if (!['load', 'domcontentloaded', 'networkidle'].includes(waitUntil)) {
      throw new Error(`Invalid waitUntil option: ${waitUntil}. Must be 'load', 'domcontentloaded', or 'networkidle'.`);
    }
    try {
      await this.page!.waitForNavigation({ waitUntil });
      console.log(`Navigation completed, waiting for: ${waitUntil}.`);
    } catch (error: any) {
      console.error('Failed to wait for navigation:', error);
      throw new Error(`Failed to wait for navigation: ${error.message || error}`);
    }
  }

  async close(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close();
        console.log('Browser closed successfully.');
      } else {
        console.log('Browser was not launched or already closed.');
      }
    } catch (error: any) {
      console.error('Failed to close browser:', error);
      throw new Error(`Failed to close browser: ${error.message || error}`);
    } finally {
      this.browser = null;
      this.context = null;
      this.page = null;
      this.domService = null; 
    }
  }
}