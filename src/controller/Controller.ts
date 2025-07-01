import { ActionRegistry, ActionDefinition, ActionParameter } from './ActionRegistry';
import { BrowserManager } from '../browser/BrowserManager';

export interface ActionResult {
  success: boolean;
  action: string;
  parameters: Record<string, any>;
  result?: any;
  error?: string;
  timestamp: Date;
  duration: number;
}

export class Controller {
  private registry: ActionRegistry;
  private browserManager: BrowserManager;
  private actionHistory: ActionResult[] = [];
  private isBrowserLaunched: boolean = false;

  constructor(browserManager: BrowserManager) {
    this.registry = new ActionRegistry();
    this.browserManager = browserManager;
    this.registerDefaultActions();
  }

  async init(headless: boolean = false): Promise<void> {
    if (this.isBrowserLaunched) {
      console.warn('Browser is already launched.');
      return;
    }
    try {
      await this.browserManager.launch(headless);
      this.isBrowserLaunched = true;
      console.log('Controller initialized: Browser launched.');
    } catch (error: any) {
      console.error('Failed to initialize Controller (launch browser):', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (!this.isBrowserLaunched) {
      console.warn('Browser is not launched. No need to shut down.');
      return;
    }
    try {
      await this.browserManager.close();
      this.isBrowserLaunched = false;
      this.clearActionHistory();
      console.log('Controller shut down: Browser closed.');
    } catch (error: any) {
      console.error('Failed to shut down Controller (close browser):', error);
      throw error;
    }
  }

  private registerDefaultActions(): void {
    this.registry.register({
      name: 'goto',
      description: 'Navigate to a URL',
      parameters: {
        url: {
          type: 'string',
          required: true,
          description: 'URL to navigate to',
          pattern: '^https?://.+'
        }
      },
      execute: async (params: Record<string, any>) => { 
        const { url } = params;
        await this.browserManager.goto(url);
        return { message: `Mapsd to ${url}` };
      }
    });

    this.registry.register({
      name: 'click',
      description: 'Click an element by selector',
      parameters: {
        selector: {
          type: 'string',
          required: true,
          description: 'CSS selector of element to click'
        },
        waitForSelector: {
          type: 'boolean',
          required: false,
          description: 'Whether to wait for selector to be visible before clicking (default: false)',
          enum: [true, false]
        }
      },
      execute: async (params: Record<string, any>) => { 
        const { selector, waitForSelector } = params;
        if (waitForSelector) {
          await this.browserManager.waitForSelector(selector);
        }
        await this.browserManager.click(selector);
        return { message: `Clicked element: ${selector}` };
      }
    });

    this.registry.register({
      name: 'type',
      description: 'Type text into an input field',
      parameters: {
        selector: {
          type: 'string',
          required: true,
          description: 'CSS selector of input field'
        },
        text: {
          type: 'string',
          required: true,
          description: 'Text to type into the field'
        },
        clearFirst: {
          type: 'boolean',
          required: false,
          description: 'Whether to clear the field before typing (default: false)',
          enum: [true, false]
        }
      },
      execute: async (params: Record<string, any>) => { 
        const { selector, text, clearFirst } = params;
        if (clearFirst) {
          await this.browserManager.type(selector, '');
        }
        await this.browserManager.type(selector, text);
        return { message: `Typed "${text}" into ${selector}` };
      }
    });

    this.registry.register({
      name: 'extractText',
      description: 'Extract text content from an element',
      parameters: {
        selector: {
          type: 'string',
          required: true,
          description: 'CSS selector of the element to extract text from'
        }
      },
      execute: async (params: Record<string, any>) => { 
        const { selector } = params;
        const text = await this.browserManager.extractText(selector);
        return { text: text, message: `Extracted text from ${selector}` };
      }
    });

    this.registry.register({
      name: 'screenshot',
      description: 'Take a screenshot of the current page',
      parameters: {
        path: {
          type: 'string',
          required: false,
          description: 'Optional path to save the screenshot (e.g., "screenshots/my_screenshot.png"). If not provided, returns base64 string.',
          pattern: '^.+\\.(png|jpeg|jpg)$'
        },
        fullPage: {
          type: 'boolean',
          required: false,
          description: 'Whether to take a screenshot of the full scrollable page (default: false)',
          enum: [true, false]
        }
      },
      execute: async (params: Record<string, any>) => { 
        const { path, fullPage } = params;
        const base64Image = await this.browserManager.screenshot(path, fullPage);
        return { message: path ? `Screenshot saved to ${path}` : 'Screenshot captured as base64', image: base64Image };
      }
    });

    this.registry.register({
      name: 'getPageHtml',
      description: 'Get the full HTML content of the current page',
      parameters: {},
      execute: async (params: Record<string, any>) => { 
        const html = await this.browserManager.getPageDomHtml();
        return { html: html, message: 'Full page HTML retrieved' };
      }
    });

    this.registry.register({
      name: 'highlightElements',
      description: 'Highlight interactive elements on the page for visual inspection or selection.',
      parameters: {
        scriptPath: {
          type: 'string',
          required: true,
          description: 'Path to the JavaScript script (e.g., buildDomTree.js) that handles highlighting.',
          pattern: '^.+\\.js$'
        },
        options: {
          type: 'object',
          required: false,
          description: 'Custom options for the highlighting script.',
          properties: {
            doHighlightElements: {
              type: 'boolean',
              required: false,
              description: 'If true, elements will be visually highlighted (default: true).',
              enum: [true, false]
            },
            focusHighlightIndex: {
              type: 'number',
              required: false,
              description: 'Highlight index of a specific element to focus/scroll to (default: -1, no specific focus).',
              minimum: -1
            },
            viewportExpansion: {
              type: 'number',
              required: false,
              description: 'Additional pixels to expand the viewport when focusing on an element (default: 0).',
              minimum: 0
            },
            debugMode: {
              type: 'boolean',
              required: false,
              description: 'Enable debug mode for the highlighting script (default: false).',
              enum: [true, false]
            }
          }
        }
      },
      execute: async (params: Record<string, any>) => { 
        const { scriptPath, options } = params;
        await this.browserManager.highlightDomTreeElements(scriptPath, options || {});
        return { message: 'Elements highlighted successfully.' };
      }
    });

    this.registry.register({
      name: 'getClickableElements',
      description: 'Get a list of all clickable elements on the current page.',
      parameters: {},
      execute: async (params: Record<string, any>) => { 
        const clickableElements = await this.browserManager.getClickableElementsDetails();
        return { elements: clickableElements, message: `Found ${clickableElements.length} clickable elements.` };
      }
    });

    this.registry.register({
      name: 'removeHighlights',
      description: 'Remove all active highlights from the page.',
      parameters: {},
      execute: async (params: Record<string, any>) => { 
        await this.browserManager.removeHighlights();
        return { message: 'All highlights removed from the page.' };
      }
    });

    this.registry.register({
      name: 'scrollTo',
      description: 'Scrolls the page to make a specific element visible.',
      parameters: {
        selector: {
          type: 'string',
          required: true,
          description: 'CSS selector of the element to scroll into view.'
        }
      },
      execute: async (params: Record<string, any>) => { 
        const { selector } = params;
        await this.browserManager.scrollTo(selector);
        return { message: `Scrolled to element: ${selector}` };
      }
    });

    this.registry.register({
  name: 'waitForSelector',
  description: 'Wait for an element to appear in the DOM.',
  parameters: {
    selector: {
      type: 'string',
      required: true,
      description: 'CSS selector to wait for'
    },
    timeout: {
      type: 'number',
      required: false,
      description: 'Timeout in milliseconds (default: 10000)'
    }
  },
  execute: async (params: Record<string, any>) => {
    await this.browserManager.waitForSelector(params.selector, params.timeout);
    return { message: `Waited for selector: ${params.selector}` };
  }
});
this.registry.register({
  name: 'refresh',
  description: 'Refresh the current page.',
  parameters: {},
  execute: async (_params: Record<string, any>) => {
    await this.browserManager.refresh();
    return { message: 'Page refreshed.' };
  }
});

this.registry.register({
  name: 'goBack',
  description: 'Go back in browser history.',
  parameters: {},
  execute: async (_params: Record<string, any>) => {
    await this.browserManager.goBack();
    return { message: 'Navigated back in history.' };
  }
});

this.registry.register({
  name: 'goForward',
  description: 'Go forward in browser history.',
  parameters: {},
  execute: async (_params: Record<string, any>) => {
    await this.browserManager.goForward();
    return { message: 'Navigated forward in history.' };
  }
});

this.registry.register({
  name: 'newTab',
  description: 'Open a new browser tab, optionally navigating to a URL.',
  parameters: {
    url: {
      type: 'string',
      required: false,
      description: 'URL to open in the new tab (optional).'
    }
  },
  execute: async (params: Record<string, any>) => {
    await this.browserManager.newTab(params.url);
    return { message: params.url ? `New tab opened and navigated to ${params.url}` : 'New tab opened.' };
  }
});

this.registry.register({
  name: 'switchTab',
  description: 'Switch to a specific tab by its index.',
  parameters: {
    index: {
      type: 'number',
      required: true,
      description: 'Tab index to switch to (0-based).'
    }
  },
  execute: async (params: Record<string, any>) => {
    await this.browserManager.switchToTab(params.index);
    return { message: `Switched to tab at index ${params.index}.` };
  }
});

this.registry.register({
  name: 'closeTab',
  description: 'Close a tab by its index (or the current tab if not specified).',
  parameters: {
    index: {
      type: 'number',
      required: false,
      description: 'Tab index to close (optional).'
    }
  },
  execute: async (params: Record<string, any>) => {
    await this.browserManager.closeTab(params.index);
    return { message: params.index !== undefined ? `Closed tab at index ${params.index}.` : 'Closed current tab.' };
  }
});

this.registry.register({
  name: 'uploadFile',
  description: 'Upload a file to a file input element.',
  parameters: {
    selector: {
      type: 'string',
      required: true,
      description: 'CSS selector of the file input element.'
    },
    filePath: {
      type: 'string',
      required: true,
      description: 'Path to the file to upload.'
    }
  },
  execute: async (params: Record<string, any>) => {
    await this.browserManager.uploadFile(params.selector, params.filePath);
    return { message: `File ${params.filePath} uploaded to ${params.selector}.` };
  }
});

this.registry.register({
  name: 'dragAndDrop',
  description: 'Drag an element and drop it onto another element.',
  parameters: {
    sourceSelector: {
      type: 'string',
      required: true,
      description: 'CSS selector of the element to drag.'
    },
    targetSelector: {
      type: 'string',
      required: true,
      description: 'CSS selector of the drop target element.'
    }
  },
  execute: async (params: Record<string, any>) => {
    await this.browserManager.dragAndDrop(params.sourceSelector, params.targetSelector);
    return { message: `Dragged ${params.sourceSelector} to ${params.targetSelector}.` };
  }
});

this.registry.register({
  name: 'setLocalStorage',
  description: 'Set a value in localStorage.',
  parameters: {
    key: {
      type: 'string',
      required: true,
      description: 'Key to set in localStorage.'
    },
    value: {
      type: 'string',
      required: true,
      description: 'Value to set for the key.'
    }
  },
  execute: async (params: Record<string, any>) => {
    await this.browserManager.setLocalStorage(params.key, params.value);
    return { message: `Set localStorage key "${params.key}" to "${params.value}".` };
  }
});

this.registry.register({
  name: 'getLocalStorage',
  description: 'Get a value from localStorage.',
  parameters: {
    key: {
      type: 'string',
      required: true,
      description: 'Key to get from localStorage.'
    }
  },
  execute: async (params: Record<string, any>) => {
    const value = await this.browserManager.getLocalStorage(params.key);
    return { key: params.key, value, message: `Got localStorage key "${params.key}".` };
  }
});

    this.registry.register({
      name: 'selectOption',
      description: 'Selects an option in a <select> dropdown element by its value.',
      parameters: {
        selector: {
          type: 'string',
          required: true,
          description: 'CSS selector of the <select> element.'
        },
        value: {
          type: 'string',
          required: true,
          description: 'The value attribute of the <option> to select.'
        }
      },
      execute: async (params: Record<string, any>) => { 
        const { selector, value } = params;
        await this.browserManager.selectOption(selector, value);
        return { message: `Selected option "${value}" in dropdown ${selector}.` };
      }
    });

    console.log('Default actions registered successfully.');
  }

  async executeAction(actionName: string, parameters: Record<string, any> = {}): Promise<ActionResult> {
    const startTime = Date.now();
    const timestamp = new Date();

    if (!this.isBrowserLaunched && actionName !== 'init') {
      const actionResult: ActionResult = {
        success: false,
        action: actionName,
        parameters,
        error: 'Browser is not launched. Call "init()" first.',
        timestamp,
        duration: 0
      };
      this.actionHistory.push(actionResult);
      console.error(`❌ Action "${actionName}" failed: Browser is not launched. Call "init()" first.`);
      return actionResult;
    }

    try {
      const result = await this.registry.executeAction(actionName, parameters);

      const duration = Date.now() - startTime;
      const actionResult: ActionResult = {
        success: true,
        action: actionName,
        parameters,
        result,
        timestamp,
        duration
      };

      this.actionHistory.push(actionResult);
      console.log(`✅ Action "${actionName}" executed successfully in ${duration}ms.`);
      
      return actionResult;

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const actionResult: ActionResult = {
        success: false,
        action: actionName,
        parameters,
        error: error.message,
        timestamp,
        duration
      };

      this.actionHistory.push(actionResult);
      console.error(`❌ Action "${actionName}" failed: ${error.message}`);
      
      return actionResult;
    }
  }

  getAvailableActions(): ActionDefinition[] {
    return this.registry.getAll();
  }

  getActionsSchema() {
    return this.registry.getActionsSchema();
  }

  findActionsByParameter(queryParams: Record<string, string | { type: string; value?: any }>): string[] {
    return this.registry.findActionByParameter(queryParams);
  }

  registerCustomAction(action: ActionDefinition, overwrite = false): void {
    this.registry.register(action, overwrite);
    console.log(`Custom action "${action.name}" registered.`);
  }

  removeCustomAction(actionName: string): boolean {
    const removed = this.registry.remove(actionName);
    if (removed) {
      console.log(`Custom action "${actionName}" removed.`);
    }
    return removed;
  }

  getActionHistory(): ActionResult[] {
    return [...this.actionHistory];
  }

  clearActionHistory(): void {
    this.actionHistory = [];
    console.log('Action history cleared.');
  }
}