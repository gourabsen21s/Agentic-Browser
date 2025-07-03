// src/browser/BrowserManager.ts

import { Browser, BrowserContext, chromium, Page, Cookie, Download, Frame, Request, Route } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { getLogger } from '../shared/logger'; // Import your custom logger
import { DOMService } from './DOMService'; // Import the DOMService you just created
import { BrowserProfile, BrowserStateSummary, ClickableElement, DOMHistoryElement, DomTreeResult } from '../shared/types'; // Import necessary types from shared

const logger = getLogger('BrowserManager'); // Get a logger instance for this service

/**
 * Manages Playwright browser instances, contexts, and pages.
 * Provides high-level browser interaction methods and delegates specific DOM
 * operations to the `DOMService`.
 */
export class BrowserManager {
  private browser: Browser | null = null; // The Playwright Browser instance
  private context: BrowserContext | null = null; // The Playwright BrowserContext instance
  private page: Page | null = null; // The current Playwright Page instance
  private domService: DOMService | null = null; 
  
  // Default browser profile settings. These can be overridden during launch.
  public browserProfile: BrowserProfile = {
    keep_alive: false, // Default: browser closes after the session ends
    allowed_domains: [], // Default: no domain restrictions
    wait_between_actions: 0.1, // Default: 100ms wait between automated actions
    userAgent: undefined, // Default: Playwright's default user agent
  };

  /**
   * Internal helper to ensure that essential browser components are initialized
   * before attempting to perform operations that depend on them.
   * Throws an error if a required component is missing.
   * @param component The specific component to check ('browser', 'context', 'page', 'domService').
   */
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
    if (component === 'domService' && !this.domService) {
      throw new Error('DOMService is not initialized. Ensure a page is active (call launch() or newTab()).');
    }
  }

  /**
   * Launches a Playwright browser instance and sets up a new browser context and page.
   * Initializes the DOMService with the newly created page.
   * @param headless Whether to run the browser in headless mode (default: `false`).
   * @param browserProfile Optional partial browser profile settings to merge with defaults.
   */
  async launch(headless = false, browserProfile?: Partial<BrowserProfile>): Promise<void> {
    try {
      this.browser = await chromium.launch({ headless }); // Launch Chromium browser
      if (browserProfile) {
        // Merge provided profile settings with the default profile
        this.browserProfile = { ...this.browserProfile, ...browserProfile };
      }
      this.context = await this.browser.newContext({
        bypassCSP: true, // Useful for injecting scripts that might otherwise be blocked
        userAgent: this.browserProfile.userAgent, // Set custom user agent from profile
        // Additional context options can be added here based on `this.browserProfile`
        // e.g., `viewport: { width: 1280, height: 720 }`, `permissions: ['clipboard-read']`
      });
      this.page = await this.context.newPage(); // Open a new page in the context
      this.domService = new DOMService(this.page); // Initialize DOMService with the active page
      logger.info(`Browser launched successfully in ${headless ? 'headless' : 'headful'} mode.`);
    } catch (error: any) {
      logger.error('Failed to launch browser:', error);
      throw new Error(`Failed to launch browser: ${error.message || error}`);
    }
  }

  /**
   * Navigates the current page to a specified URL.
   * @param url The URL string to navigate to.
   * @throws An error if the browser page is not launched or the URL is invalid.
   */
  async goto(url: string): Promise<void> {
    this.ensureBrowserComponents('page');
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL provided for goto(). URL must be a non-empty string.');
    }
    try {
      // Navigate to the URL and wait until the DOM content is fully loaded
      await this.page!.goto(url, { waitUntil: 'domcontentloaded' });
      logger.info(`Mapsd to: ${url}`);
    } catch (error: any) {
      logger.error(`Failed to navigate to ${url}:`, error);
      throw new Error(`Failed to navigate to ${url}: ${error.message || error}`);
    }
  }

  /**
   * Refreshes (reloads) the current page.
   * @throws An error if the browser page is not launched.
   */
  async refresh(): Promise<void> {
    this.ensureBrowserComponents('page');
    try {
      await this.page!.reload();
      logger.info('Page refreshed successfully.');
    } catch (error: any) {
      logger.error('Failed to refresh page:', error);
      throw new Error(`Failed to refresh page: ${error.message || error}`);
    }
  }

  /**
   * Navigates back in the browser's history.
   * @throws An error if the browser page is not launched.
   */
  async goBack(): Promise<void> {
    this.ensureBrowserComponents('page');
    try {
      const response = await this.page!.goBack(); // Perform the 'go back' action
      if (response === null) {
        logger.warn('Cannot go back: no previous history entry.');
      } else {
        logger.info('Navigated back in history.');
      }
    } catch (error: any) {
      logger.error('Failed to go back in history:', error);
      throw new Error(`Failed to go back in history: ${error.message || error}`);
    }
  }

  /**
   * Navigates forward in the browser's history.
   * @throws An error if the browser page is not launched.
   */
  async goForward(): Promise<void> {
    this.ensureBrowserComponents('page');
    try {
      const response = await this.page!.goForward(); // Perform the 'go forward' action
      if (response === null) {
        logger.warn('Cannot go forward: no next history entry.');
      } else {
        logger.info('Navigated forward in history.');
      }
    } catch (error: any) {
      logger.error('Failed to go forward in history:', error);
      throw new Error(`Failed to go forward in history: ${error.message || error}`);
    }
  }

  /**
   * Clicks an element identified by a CSS selector.
   * @param selector The CSS selector of the element to click.
   * @throws An error if the browser page is not launched or the selector is invalid/element is not interactable.
   */
  async click(selector: string): Promise<void> {
    this.ensureBrowserComponents('page');
    if (!selector || typeof selector !== 'string') {
      throw new Error('Invalid selector provided for click(). Selector must be a non-empty string.');
    }
    try {
      await this.page!.click(selector); // Click the element
      logger.info(`Clicked element: ${selector}`);
    } catch (error: any) {
      logger.error(`Failed to click element ${selector}:`, error);
      throw new Error(`Failed to click element ${selector}. It might not be visible or interactable: ${error.message || error}`);
    }
  }

  /**
   * Types text into an input field identified by a CSS selector.
   * @param selector The CSS selector of the input field.
   * @param text The text string to type.
   * @throws An error if the browser page is not launched or the selector/text is invalid.
   */
  async type(selector: string, text: string): Promise<void> {
    this.ensureBrowserComponents('page');
    if (!selector || typeof selector !== 'string') {
      throw new Error('Invalid selector provided for type(). Selector must be a non-empty string.');
    }
    if (typeof text !== 'string') {
      throw new Error('Invalid text provided for type(). Text must be a string.');
    }
    try {
      await this.page!.fill(selector, text); // Fill the input field with text
      logger.info(`Typed into ${selector}: "${text}"`);
    } catch (error: any) {
      logger.error(`Failed to type into element ${selector}:`, error);
      throw new Error(`Failed to type into element ${selector}. It might not be an input field or interactable: ${error.message || error}`);
    }
  }

  /**
   * Extracts the text content from an element identified by a CSS selector.
   * @param selector The CSS selector of the element to extract text from.
   * @returns A Promise that resolves with the text content as a string, or `null` if the element is not found.
   * @throws An error if the browser page is not launched or the selector is invalid.
   */
  async extractText(selector: string): Promise<string | null> {
    this.ensureBrowserComponents('page');
    if (!selector || typeof selector !== 'string') {
      throw new Error('Invalid selector provided for extractText(). Selector must be a non-empty string.');
    }
    try {
      const text = await this.page!.textContent(selector); // Get the text content
      logger.debug(`Extracted text from ${selector}: "${text}"`);
      return text;
    } catch (error: any) {
      logger.error(`Failed to extract text from element ${selector}:`, error);
      throw new Error(`Failed to extract text from element ${selector}: ${error.message || error}`);
    }
  }

  /**
   * Takes a screenshot of the current page.
   * @param screenshotPath Optional file path to save the screenshot (e.g., 'screenshots/mypage.png').
   * If not provided, the screenshot is returned as a base64 string.
   * @param fullPage Whether to take a screenshot of the full scrollable page (default: `false`).
   * @returns A Promise that resolves with the screenshot as a base64 string.
   * @throws An error if the browser page is not launched or the path is invalid.
   */
  async screenshot(screenshotPath?: string, fullPage = false): Promise<string> {
    this.ensureBrowserComponents('page');
    if (screenshotPath && typeof screenshotPath !== 'string') {
      throw new Error('Invalid path provided for screenshot(). Path must be a string.');
    }
    try {
      const buffer = await this.page!.screenshot({ path: screenshotPath, fullPage }); // Take screenshot
      const base64 = buffer.toString('base64');
      logger.info(`Screenshot ${screenshotPath ? `saved to ${screenshotPath}` : 'taken as base64'}.`);
      return base64;
    } catch (error: any) {
      logger.error(`Failed to take screenshot${screenshotPath ? ` to ${screenshotPath}` : ''}:`, error);
      throw new Error(`Failed to take screenshot: ${error.message || error}`);
    }
  }

  // --- DOMService Delegated Methods ---
  // These methods directly delegate calls to the internal DOMService instance,
  // providing a unified API for browser and DOM operations through BrowserManager.

  /**
   * Delegates to DOMService: Extracts the full HTML content of the current page.
   */
  async getPageDomHtml(): Promise<string> {
    this.ensureBrowserComponents('domService');
    return this.domService!.getDomHtml();
  }

  /**
   * Delegates to DOMService: Retrieves a list of all clickable/interactive elements on the current page.
   */
  async getClickableElementsDetails(): Promise<ClickableElement[]> {
    this.ensureBrowserComponents('domService');
    return this.domService!.getClickableElements();
  }

  /**
   * Delegates to DOMService: Injects a JavaScript script from a file into the page
   * and optionally calls a function within that script for highlighting DOM elements.
   */
  
  async highlightDomTreeElements(scriptPath: string, args: any = {}): Promise<void> {
    this.ensureBrowserComponents('domService');
    return this.domService!.highlightDomTree(scriptPath, args);
  }

  /**
   * Delegates to DOMService: Injects a JavaScript script and calls a function within it
   * to extract a structured representation of the DOM tree.
   */
  async getStructuredDomTree(scriptPath: string, args: any = {}): Promise<DomTreeResult | null> {
    this.ensureBrowserComponents('domService');
    return this.domService!.getStructuredDomTree(scriptPath, args);
  }

  /**
   * Delegates to DOMService: Retrieves an element's data from a structured DOM tree by its highlight index.
   */
  async getElementDetailsByIndex(scriptPath: string, index: number, args: any = {}): Promise<any | null> {
    this.ensureBrowserComponents('domService');
    return this.domService!.getElementByIndex(scriptPath, index, args);
  }

  /**
   * Delegates to DOMService: Extracts all visible text nodes from the current page.
   */
  async getAllVisibleTextNodes(): Promise<{ text: string; parentSelector: string }[]> {
    this.ensureBrowserComponents('domService');
    return this.domService!.getAllVisibleTextNodes();
  }

  /**
   * Delegates to DOMService: Removes all highlights or injected styling from the page.
   */
  async removeHighlights(): Promise<void> {
    this.ensureBrowserComponents('domService');
    return this.domService!.removeHighlights();
  }
  // --- End DOMService Delegated Methods ---

  /**
   * Waits for an element identified by a CSS selector to appear in the DOM
   * and become visible/ready.
   * @param selector The CSS selector of the element to wait for.
   * @param timeout The maximum time to wait in milliseconds (default: 10000ms).
   * @throws An error if the browser page is not launched or the element does not appear within the timeout.
   */
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
      logger.debug(`Selector ${selector} appeared within timeout.`);
    } catch (error: any) {
      logger.error(`Failed to wait for selector ${selector}:`, error);
      throw new Error(`Failed to wait for selector ${selector}. It did not appear within ${timeout}ms: ${error.message || error}`);
    }
  }

  /**
   * Evaluates an arbitrary JavaScript function within the context of the current page.
   * @param fn The JavaScript function to execute.
   * @param args Optional arguments to pass to the function.
   * @returns A Promise that resolves with the return value of the executed function.
   * @throws An error if the browser page is not launched or the function execution fails.
   */
  async evaluate<T>(fn: (...args: any[]) => T, ...args: any[]): Promise<T> {
    this.ensureBrowserComponents('page');
    if (typeof fn !== 'function') {
      throw new Error('Invalid function provided for evaluate(). Must be a function.');
    }
    try {
      const result = await this.page!.evaluate(fn, ...args);
      logger.debug('Evaluated function in page context.');
      return result;
    } catch (error: any) {
      logger.error('Failed to evaluate function in page context:', error);
      throw new Error(`Failed to evaluate function in page context: ${error.message || error}`);
    }
  }

  /**
   * Injects a JavaScript script from a file into the current page's context.
   * This is useful for adding polyfills, helper functions, or custom logic to the page.
   * @param filePath The absolute path to the JavaScript file.
   * @throws An error if the browser page is not launched, the path is invalid, or the script file does not exist.
   */
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
      logger.debug(`Script injected from file: ${filePath}`);
    } catch (error: any) {
      logger.error(`Failed to inject script from file ${filePath}:`, error);
      throw new Error(`Failed to inject script from file ${filePath}: ${error.message || error}`);
    }
  }

  /**
   * Uploads a file to an `<input type="file">` element.
   * @param selector The CSS selector of the file input element.
   * @param filePath The absolute path to the file to upload.
   * @throws An error if the browser page is not launched, the input is not found, or the file does not exist.
   */
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
      const input = await this.page!.$(selector); // Find the input element
      if (!input) {
        throw new Error(`File input element not found for selector: ${selector}`);
      }
      await input.setInputFiles(filePath); // Set the file(s) to the input
      logger.info(`File ${filePath} uploaded to ${selector}.`);
    } catch (error: any) {
      logger.error(`Failed to upload file ${filePath} to ${selector}:`, error);
      throw new Error(`Failed to upload file ${filePath} to ${selector}: ${error.message || error}`);
    }
  }

  /**
   * Performs a drag-and-drop action from a source element to a target element.
   * @param sourceSelector The CSS selector of the element to drag.
   * @param targetSelector The CSS selector of the element to drop onto.
   * @throws An error if the browser page is not launched or selectors are invalid.
   */
  async dragAndDrop(sourceSelector: string, targetSelector: string): Promise<void> {
    this.ensureBrowserComponents('page');
    if (!sourceSelector || typeof sourceSelector !== 'string') {
      throw new Error('Invalid source selector provided for dragAndDrop(). Selector must be a non-empty string.');
    }
    if (!targetSelector || typeof targetSelector !== 'string') {
      throw new Error('Invalid target selector provided for dragAndDrop(). Selector must be a non-empty string.');
    }
    try {
      await this.page!.dragAndDrop(sourceSelector, targetSelector); // Perform drag and drop
      logger.info(`Dragged from ${sourceSelector} to ${targetSelector}.`);
    } catch (error: any) {
      logger.error(`Failed to drag and drop from ${sourceSelector} to ${targetSelector}:`, error);
      throw new Error(`Failed to drag and drop from ${sourceSelector} to ${targetSelector}: ${error.message || error}`);
    }
  }

  /**
   * Opens a new browser tab within the current context and switches to it.
   * Optionally navigates the new tab to a specified URL.
   * @param url Optional URL to navigate to in the new tab.
   * @throws An error if the browser context is not initialized.
   */
  async newTab(url?: string): Promise<void> {
    this.ensureBrowserComponents('context');
    if (url && typeof url !== 'string') {
      throw new Error('Invalid URL provided for newTab(). URL must be a string.');
    }
    try {
      const newPage = await this.context!.newPage(); // Open new page
      this.page = newPage; // Set as current page
      this.domService = new DOMService(this.page); // Re-initialize DOMService for the new page
      if (url) {
        await this.page.goto(url);
        logger.info(`New tab opened and navigated to: ${url}`);
      } else {
        logger.info('New tab opened.');
      }
    } catch (error: any) {
      logger.error('Failed to open a new tab:', error);
      throw new Error(`Failed to open a new tab: ${error.message || error}`);
    }
  }

  /**
   * Switches the active page to a different tab by its 0-based index within the current context.
   * @param index The 0-based index of the tab to switch to.
   * @throws An error if the browser context is not initialized or the index is out of range.
   */
  async switchToTab(index: number): Promise<void> {
    this.ensureBrowserComponents('context');
    if (typeof index !== 'number' || index < 0) {
      throw new Error('Invalid index provided for switchToTab(). Index must be a non-negative number.');
    }
    try {
      const pages = this.context!.pages(); // Get all pages in the context
      if (index >= pages.length) {
        throw new Error(`Tab index ${index} out of range. There are only ${pages.length} tabs open.`);
      }
      this.page = pages[index]; // Set the specified page as current
      this.domService = new DOMService(this.page); // Update DOMService to the switched page
      logger.info(`Switched to tab at index: ${index}`);
    } catch (error: any) {
      logger.error(`Failed to switch to tab at index ${index}:`, error);
      throw new Error(`Failed to switch to tab at index ${index}: ${error.message || error}`);
    }
  }

  /**
   * Closes the current active tab, or a specific tab by its index.
   * If the current tab is closed, it attempts to switch to the first available remaining tab.
   * @param index Optional 0-based index of the tab to close. If omitted, the current tab is closed.
   * @throws An error if the browser context is not initialized.
   */
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
          logger.warn(`Attempted to close tab at index ${index}, but only ${pages.length} tabs are open. No action taken.`);
          return; // Exit if index is out of range when explicitly provided
        }
        pageToClose = pages[index];
      } else {
        // If no index, close the current page, ensuring it's part of the context's pages
        if (this.page && pages.includes(this.page)) {
          pageToClose = this.page;
        } else if (pages.length > 0) {
          // Fallback to closing the last page if current page isn't found or is already closed externally
          pageToClose = pages[pages.length - 1];
          logger.warn('Current page not found in context pages, attempting to close the last available tab.');
        }
      }

      if (pageToClose && !pageToClose.isClosed()) {
        await pageToClose.close(); // Close the selected page
        logger.info(`Tab ${index !== undefined ? `at index ${index}` : 'current'} closed.`);
      } else if (pageToClose?.isClosed()) {
        logger.info(`Tab ${index !== undefined ? `at index ${index}` : 'current'} was already closed.`);
      } else {
        logger.warn('No active tab or specified tab to close found.');
      }

      // After closing, attempt to switch to the first available remaining tab
      const remainingPages = this.context!.pages();
      if (remainingPages.length > 0) {
        this.page = remainingPages[0];
        this.domService = new DOMService(this.page); // Update DOMService to the new active page
        logger.info('Switched to the first available tab.');
      } else {
        this.page = null; // No pages left
        this.domService = null; // No page means no DOMService
        logger.info('No tabs remaining in the context.');
      }
    } catch (error: any) {
      logger.error(`Failed to close tab${index !== undefined ? ` at index ${index}` : ''}:`, error);
      throw new Error(`Failed to close tab: ${error.message || error}`);
    }
  }

  /**
   * Handles JavaScript dialogs (alerts, confirms, prompts) by accepting or dismissing them.
   * This method must be called *before* the action that triggers the dialog.
   * @param accept Whether to accept (true) or dismiss (false) the dialog (default: true).
   * @param promptText Optional text to enter if the dialog is a prompt.
   * @throws An error if the browser page is not launched or parameters are invalid.
   */
  async handleDialog(accept = true, promptText?: string): Promise<void> {
    this.ensureBrowserComponents('page');
    if (typeof accept !== 'boolean') {
      throw new Error('Invalid "accept" value provided for handleDialog(). Must be a boolean.');
    }
    if (promptText !== undefined && typeof promptText !== 'string') {
      throw new Error('Invalid "promptText" provided for handleDialog(). Must be a string or undefined.');
    }
    try {
      // Listen for the 'dialog' event once
      this.page!.once('dialog', async dialog => {
        logger.info(`Dialog of type "${dialog.type}" with message: "${dialog.message}" detected.`);
        if (accept) {
          await dialog.accept(promptText); // Accept the dialog, optionally with prompt text
          logger.info(`Dialog accepted${promptText ? ` with text: "${promptText}"` : ''}.`);
        } else {
          await dialog.dismiss(); // Dismiss the dialog
          logger.info('Dialog dismissed.');
        }
      });
    } catch (error: any) {
      logger.error('Error setting up dialog handler:', error);
      throw new Error(`Error setting up dialog handler: ${error.message || error}`);
    }
  }

  /**
   * Scrolls the page to make a specific element identified by a CSS selector visible.
   * @param selector The CSS selector of the element to scroll into view.
   * @throws An error if the browser page is not launched, selector is invalid, or element not found/visible.
   */
  async scrollTo(selector: string): Promise<void> {
    this.ensureBrowserComponents('page');
    if (!selector || typeof selector !== 'string') {
      throw new Error('Invalid selector provided for scrollTo(). Selector must be a non-empty string.');
    }
    try {
      // Wait for the element to be visible before attempting to scroll
      await this.page!.waitForSelector(selector, { state: 'visible', timeout: 5000 });
      // Use Playwright's $eval to execute `scrollIntoView` on the element in the browser context
      await this.page!.$eval(selector, el => (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' }));
      logger.info(`Scrolled to element: ${selector}`);
    } catch (error: any) {
      logger.error(`Failed to scroll to element ${selector}:`, error);
      throw new Error(`Failed to scroll to element ${selector}. Element might not be found or visible: ${error.message || error}`);
    }
  }

  /**
   * Selects an option in a `<select>` dropdown element.
   * @param selector The CSS selector of the `<select>` dropdown.
   * @param value The `value` attribute of the `<option>` to select, or an array of values for multi-select.
   * @throws An error if the browser page is not launched, selector is invalid, or option not found.
   */
  async selectOption(selector: string, value: string | string[]): Promise<void> {
    this.ensureBrowserComponents('page');
    if (!selector || typeof selector !== 'string') {
      throw new Error('Invalid selector provided for selectOption(). Selector must be a non-empty string.');
    }
    if (!value || (typeof value !== 'string' && !Array.isArray(value))) {
      throw new Error('Invalid value provided for selectOption(). Value must be a string or an array of strings.');
    }
    try {
      const selectedValues = await this.page!.selectOption(selector, value); // Select the option(s)
      if (selectedValues.length === 0) {
        logger.warn(`No option matched value "${value}" for selector "${selector}".`);
      } else {
        logger.info(`Selected option(s) "${selectedValues.join(', ')}" in dropdown: ${selector}`);
      }
    } catch (error: any) {
      logger.error(`Failed to select option "${value}" for selector ${selector}:`, error);
      throw new Error(`Failed to select option "${value}" for selector ${selector}. Selector might not be a dropdown or value not found: ${error.message || error}`);
    }
  }

  /**
   * Extracts the value of a specified HTML attribute from an element.
   * @param selector The CSS selector of the element.
   * @param attribute The name of the attribute to extract (e.g., 'href', 'value', 'data-id').
   * @returns A Promise that resolves with the attribute's value as a string, or `null` if the element or attribute is not found.
   * @throws An error if the browser page is not launched or selector/attribute is invalid.
   */
  async extractAttribute(selector: string, attribute: string): Promise<string | null> {
    this.ensureBrowserComponents('page');
    if (!selector || typeof selector !== 'string') {
      throw new Error('Invalid selector provided for extractAttribute(). Selector must be a non-empty string.');
    }
    if (!attribute || typeof attribute !== 'string') {
      throw new Error('Invalid attribute provided for extractAttribute(). Attribute must be a non-empty string.');
    }
    try {
      const value = await this.page!.getAttribute(selector, attribute); // Get attribute value
      if (value === null) {
        logger.warn(`Attribute "${attribute}" not found on element ${selector} or element not found.`);
      } else {
        logger.info(`Extracted attribute "${attribute}" from ${selector}: "${value}"`);
      }
      return value;
    } catch (error: any) {
      logger.error(`Failed to extract attribute "${attribute}" from element ${selector}:`, error);
      throw new Error(`Failed to extract attribute "${attribute}" from element ${selector}: ${error.message || error}`);
    }
  }

  /**
   * Retrieves all cookies for the current browser context.
   * @returns A Promise that resolves with an array of Playwright `Cookie` objects.
   * @throws An error if the browser context is not initialized.
   */
  async getCookies(): Promise<Cookie[]> {
    this.ensureBrowserComponents('context');
    try {
      const cookies = await this.context!.cookies(); // Get all cookies
      logger.info(`Retrieved ${cookies.length} cookies.`);
      return cookies;
    } catch (error: any) {
      logger.error('Failed to get cookies:', error);
      throw new Error(`Failed to get cookies: ${error.message || error}`);
    }
  }

  /**
   * Sets a cookie in the current browser context.
   * @param cookie The Playwright `Cookie` object to set.
   * @throws An error if the browser context is not initialized or the cookie object is invalid.
   */
  async setCookie(cookie: Cookie): Promise<void> {
    this.ensureBrowserComponents('context');
    if (!cookie || typeof cookie !== 'object') {
      throw new Error('Invalid cookie object provided for setCookie(). Must be a valid Cookie object.');
    }
    // Corrected: Removed `cookie.url` from validation. Playwright's `Cookie` type
    // for `addCookies` often only requires `name`, `value`, `domain`, `path`.
    if (!cookie.name || !cookie.value || (!cookie.domain && !cookie.path)) {
      logger.warn('Cookie object might be incomplete. Recommended properties: name, value, and either domain or path (or both).');
    }
    try {
      await this.context!.addCookies([cookie]); // Add the cookie
      logger.info(`Cookie "${cookie.name}" set.`);
    } catch (error: any) {
      logger.error(`Failed to set cookie "${cookie.name}":`, error);
      throw new Error(`Failed to set cookie "${cookie.name}": ${error.message || error}`);
    }
  }

  /**
   * Clears all cookies from the current browser context.
   * @throws An error if the browser context is not initialized.
   */
  async clearCookies(): Promise<void> {
    this.ensureBrowserComponents('context');
    try {
      await this.context!.clearCookies(); // Clear all cookies
      logger.info('All cookies cleared.');
    } catch (error: any) {
      logger.error('Failed to clear cookies:', error);
      throw new Error(`Failed to clear cookies: ${error.message || error}`);
    }
  }

  /**
   * Retrieves a value from the current page's `localStorage`.
   * @param key The key of the item to retrieve.
   * @returns A Promise that resolves with the value as a string, or `null` if the key does not exist.
   * @throws An error if the browser page is not launched or the key is invalid.
   */
  async getLocalStorage(key: string): Promise<string | null> {
    this.ensureBrowserComponents('page');
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid key provided for getLocalStorage(). Key must be a non-empty string.');
    }
    try {
      const value = await this.page!.evaluate((k) => localStorage.getItem(k), key); // Get item from localStorage
      logger.debug(`Retrieved localStorage key "${key}": "${value}"`);
      return value;
    } catch (error: any) {
      logger.error(`Failed to get localStorage for key "${key}":`, error);
      throw new Error(`Failed to get localStorage for key "${key}": ${error.message || error}`);
    }
  }

  /**
   * Sets a key-value pair in the current page's `localStorage`.
   * @param key The key to set.
   * @param value The value to set.
   * @throws An error if the browser page is not launched or key/value is invalid.
   */
  async setLocalStorage(key: string, value: string): Promise<void> {
    this.ensureBrowserComponents('page');
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid key provided for setLocalStorage(). Key must be a non-empty string.');
    }
    if (typeof value !== 'string') {
      throw new Error('Invalid value provided for setLocalStorage(). Value must be a string.');
    }
    try {
      await this.page!.evaluate(
        ([k, v]) => localStorage.setItem(k, v),
        [key, value]
      ); // Set item in localStorage
      logger.info(`Set localStorage key "${key}" to "${value}".`);
    } catch (error: any) {
      logger.error(`Failed to set localStorage for key "${key}":`, error);
      throw new Error(`Failed to set localStorage for key "${key}": ${error.message || error}`);
    }
  }

  /**
   * Clears all data from the current page's `localStorage` for its origin.
   * @throws An error if the browser page is not launched.
   */
  async clearLocalStorage(): Promise<void> {
    this.ensureBrowserComponents('page');
    try {
      await this.page!.evaluate(() => localStorage.clear()); // Clear localStorage
      logger.info('localStorage cleared.');
    } catch (error: any) {
      logger.error('Failed to clear localStorage:', error);
      throw new Error(`Failed to clear localStorage: ${error.message || error}`);
    }
  }

  /**
   * Clears all data from the current page's `sessionStorage` for its origin.
   * @throws An error if the browser page is not launched.
   */
  async clearSessionStorage(): Promise<void> {
    this.ensureBrowserComponents('page');
    try {
      await this.page!.evaluate(() => sessionStorage.clear()); // Clear sessionStorage
      logger.info('sessionStorage cleared.');
    } catch (error: any) {
      logger.error('Failed to clear sessionStorage:', error);
      throw new Error(`Failed to clear sessionStorage: ${error.message || error}`);
    }
  }

  /**
   * Initiates a file download by clicking an element and saves the downloaded file.
   * @param selector The CSS selector of the element that triggers the download.
   * @param downloadPath The absolute path where the downloaded file should be saved.
   * @throws An error if the browser page is not launched, selector/path is invalid, or download fails.
   */
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
      // Ensure the target directory for download exists
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
        logger.info(`Created download directory: ${downloadDir}`);
      }

      // Wait for the 'download' event to be triggered after clicking the selector
      const [download] = await Promise.all([
        this.page!.waitForEvent('download', { timeout: 60000 }), // Wait up to 60 seconds for download event
        this.page!.click(selector) // Click the element to trigger download
      ]);

      const suggestedFilename = download.suggestedFilename();
      const finalDownloadPath = path.join(downloadDir, suggestedFilename); // Use suggested filename

      await download.saveAs(finalDownloadPath); // Save the downloaded file
      logger.info(`File downloaded successfully to: ${finalDownloadPath}`);
    } catch (error: any) {
      logger.error(`Failed to download file triggered by ${selector} to ${downloadPath}:`, error);
      throw new Error(`Failed to download file triggered by ${selector}: ${error.message || error}`);
    }
  }

  /**
   * Intercepts and handles network requests matching a URL pattern.
   * @param urlPattern A glob pattern, regular expression, or function to match URLs.
   * @param handler A function to handle the intercepted request (`route` and `request` objects).
   * @throws An error if the browser page is not launched or parameters are invalid.
   */
  async interceptRequests(urlPattern: string | RegExp | ((url: URL) => boolean), handler: (route: Route, request: Request) => void): Promise<void> {
    this.ensureBrowserComponents('page');
    if (!urlPattern) {
      throw new Error('Invalid URL pattern provided for interceptRequests().');
    }
    if (typeof handler !== 'function') {
      throw new Error('Invalid handler function provided for interceptRequests().');
    }
    try {
      await this.page!.route(urlPattern, handler); // Set up request interception
      logger.debug(`Request interception set up for pattern: ${urlPattern}.`);
    } catch (error: any) {
      logger.error(`Failed to set up request interception for pattern ${urlPattern}:`, error);
      throw new Error(`Failed to set up request interception: ${error.message || error}`);
    }
  }

  /**
   * Emulates a specific device (e.g., 'iPhone 11', 'iPad Pro') by creating a new context
   * with device-specific viewport, user agent, etc. This closes the current context.
   * @param deviceName The name of the device to emulate (e.g., 'iPhone 11').
   * @throws An error if the browser is not launched or the device name is invalid/not found.
   */
  async emulateDevice(deviceName: string): Promise<void> {
    this.ensureBrowserComponents('browser');
    if (!deviceName || typeof deviceName !== 'string') {
      throw new Error('Invalid device name provided for emulateDevice(). Name must be a non-empty string.');
    }
    try {
      const { devices } = require('playwright'); // Playwright's built-in device definitions
      const device = devices[deviceName];
      if (!device) {
        throw new Error(`Device "${deviceName}" not found in Playwright's device list.`);
      }
      if (this.context) {
        await this.context.close(); // Close existing context
        logger.info('Existing browser context closed for device emulation.');
      }
      this.context = await this.browser!.newContext({ ...device }); // Create new context with device settings
      this.page = await this.context.newPage(); // Open new page in the emulated context
      this.domService = new DOMService(this.page); // Re-initialize DOMService
      logger.info(`Device "${deviceName}" emulated successfully.`);
    } catch (error: any) {
      logger.error(`Failed to emulate device "${deviceName}":`, error);
      throw new Error(`Failed to emulate device "${deviceName}": ${error.message || error}`);
    }
  }

  /**
   * Sets a custom user agent for the browser context. This closes the current context.
   * @param userAgent The user agent string to set.
   * @throws An error if the browser is not launched or the user agent string is invalid.
   */
  async setUserAgent(userAgent: string): Promise<void> {
    this.ensureBrowserComponents('browser');
    if (!userAgent || typeof userAgent !== 'string') {
      throw new Error('Invalid user agent provided for setUserAgent(). Must be a non-empty string.');
    }
    try {
      if (this.context) {
        await this.context.close(); // Close existing context
        logger.info('Existing browser context closed for user agent change.');
      }
      this.context = await this.browser!.newContext({ userAgent }); // Create new context with custom user agent
      this.page = await this.context.newPage(); // Open new page
      this.domService = new DOMService(this.page); // Re-initialize DOMService
      logger.info(`User agent set to: "${userAgent}".`);
    } catch (error: any) {
      logger.error(`Failed to set user agent to "${userAgent}":`, error);
      throw new Error(`Failed to set user agent to "${userAgent}": ${error.message || error}`);
    }
  }

  /**
   * Retrieves a specific frame within the current page by its name or URL.
   * @param nameOrUrl The name attribute of the frame or its URL.
   * @returns A Promise that resolves with the Playwright `Frame` object, or `null` if not found.
   * @throws An error if the browser page is not launched or the name/URL is invalid.
   */
  async getFrameByNameOrURL(nameOrUrl: string): Promise<Frame | null> {
    this.ensureBrowserComponents('page');
    if (!nameOrUrl || typeof nameOrUrl !== 'string') {
      throw new Error('Invalid name or URL provided for getFrameByNameOrURL(). Must be a non-empty string.');
    }
    try {
      // Find frame by name or by URL
      const frame = this.page!.frame({ name: nameOrUrl }) || this.page!.frame({ url: nameOrUrl });
      if (frame) {
        logger.debug(`Found frame by name/URL: ${nameOrUrl}.`);
      } else {
        logger.warn(`Frame with name or URL "${nameOrUrl}" not found.`);
      }
      return frame;
    } catch (error: any) {
      logger.error(`Failed to get frame by name or URL "${nameOrUrl}":`, error);
      throw new Error(`Failed to get frame by name or URL "${nameOrUrl}": ${error.message || error}`);
    }
  }

  /**
   * Waits for the page navigation to complete based on a specified condition.
   * @param waitUntil The event to wait for ('load', 'domcontentloaded', 'networkidle'). Default: 'domcontentloaded'.
   * @throws An error if the browser page is not launched or the waitUntil option is invalid.
   */
  async waitForNavigation(waitUntil: 'load' | 'domcontentloaded' | 'networkidle' = 'domcontentloaded'): Promise<void> {
    this.ensureBrowserComponents('page');
    if (!['load', 'domcontentloaded', 'networkidle'].includes(waitUntil)) {
      throw new Error(`Invalid waitUntil option: ${waitUntil}. Must be 'load', 'domcontentloaded', or 'networkidle'.`);
    }
    try {
      await this.page!.waitForNavigation({ waitUntil });
      logger.debug(`Navigation completed, waiting for: ${waitUntil}.`);
    } catch (error: any) {
      logger.error('Failed to wait for navigation:', error);
      throw new Error(`Failed to wait for navigation: ${error.message || error}`);
    }
  }

  /**
   * Closes the browser and cleans up all associated resources (context, page).
   * Resets internal references to null.
   * @throws An error if the browser fails to close.
   */
  async close(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close(); // Close the browser
        logger.info('Browser closed successfully.');
      } else {
        logger.info('Browser was not launched or already closed.');
      }
    } catch (error: any) {
      logger.error('Failed to close browser:', error);
      throw new Error(`Failed to close browser: ${error.message || error}`);
    } finally {
      // Ensure all references are cleared regardless of success or failure
      this.browser = null;
      this.context = null;
      this.page = null;
      this.domService = null;
    }
  }

  /**
   * Helper method to get the current active Playwright Page instance.
   * @returns The current Playwright Page.
   * @throws An error if no page is currently active.
   */
  async getCurrentPage(): Promise<Page> {
    this.ensureBrowserComponents('page');
    return this.page!;
  }

  /**
   * CORRECTED: Added synchronous getter for the current page.
   * This is used by the logger getter in AgentService which cannot be async.
   * @returns The current Playwright Page instance if active, otherwise null.
   */
  public getCurrentPageSync(): Page | null {
    return this.page;
  }

  /**
   * Retrieves a comprehensive summary of the current browser's state.
   * This includes URL, title, screenshot, tabs, and a map of interactive DOM elements.
   * @param cacheClickableElementsHashes Whether to ensure clickable element hashes are cached (if DOMService supports it).
   * @returns A Promise that resolves with a `BrowserStateSummary` object.
   * @throws An error if browser components are not initialized or DOM operations fail.
   */
  async getStateSummary(cacheClickableElementsHashes: boolean): Promise<BrowserStateSummary> {
    this.ensureBrowserComponents('page');
    this.ensureBrowserComponents('domService');

    const url = this.page!.url();
    const title = await this.page!.title();
    // Capture screenshot, handle potential errors (e.g., page not ready)
    const screenshot = await this.page!.screenshot().then(buf => buf.toString('base64')).catch(e => {
      logger.warn(`Could not capture screenshot: ${e.message}`);
      return null;
    });

    // Get information about all open tabs in the current context
    const pagesInContext = this.context!.pages();
    const tabs = await Promise.all(pagesInContext.map(async (p, idx) => ({
        id: idx,
        title: await p.title(),
        url: p.url(),
        active: p === this.page,
    })));

    const clickableElements = await this.domService!.getClickableElements();
    const selectorMap: Record<string, DOMHistoryElement> = {};
    for (const el of clickableElements) {
      // Create a dummy hash and node_id for now. In a real system, DOMService
      // would generate these hashes from the element's path/attributes.
      const dummyHash = { branch_path_hash: `${el.selector}-${el.index}` };
      selectorMap[el.index] = {
        node_id: `${el.tagName}-${el.index}`,
        highlight_index: el.index,
        hash: dummyHash,
        tagName: el.tagName,
        attributes: el.attributes,
        text: el.text,
        boundingBox: el.boundingBox
      };
    }

    return { url, title, screenshot, tabs, selectorMap };
  }
}