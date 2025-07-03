"use strict";
// src/controller/Controller.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Controller = void 0;
const ActionRegistry_1 = require("../agent/ActionRegistry");
const logger_1 = require("../shared/logger");
const logger = (0, logger_1.getLogger)('Controller');
class Controller {
    constructor(browserManager) {
        this.actionHistory = [];
        this.isBrowserLaunched = false;
        this.registry = new ActionRegistry_1.ActionRegistry();
        this.browserManager = browserManager;
        this.registerDefaultActions();
    }
    init() {
        return __awaiter(this, arguments, void 0, function* (headless = false) {
            if (this.isBrowserLaunched) {
                logger.warn('Browser is already launched. Skipping initialization.');
                return;
            }
            try {
                yield this.browserManager.launch(headless);
                this.isBrowserLaunched = true;
                logger.info('Controller initialized: Browser launched.');
            }
            catch (error) {
                logger.error('Failed to initialize Controller (launch browser):', error);
                throw error;
            }
        });
    }
    shutdown() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isBrowserLaunched) {
                logger.warn('Browser is not launched. No need to shut down.');
                return;
            }
            try {
                yield this.browserManager.close();
                this.isBrowserLaunched = false;
                this.clearActionHistory();
                logger.info('Controller shut down: Browser closed.');
            }
            catch (error) {
                logger.error('Failed to shut down Controller (close browser):', error);
                throw error;
            }
        });
    }
    registerDefaultActions() {
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
            execute: (params) => __awaiter(this, void 0, void 0, function* () {
                const { url } = params;
                yield this.browserManager.goto(url);
                return { message: `Mapsd to ${url}` };
            })
        });
        this.registry.register({
            name: 'refresh',
            description: 'Refreshes the current page',
            parameters: {},
            execute: (params) => __awaiter(this, void 0, void 0, function* () {
                yield this.browserManager.refresh();
                return { message: 'Page refreshed successfully.' };
            })
        });
        this.registry.register({
            name: 'goBack',
            description: 'Navigates back in the browser history',
            parameters: {},
            execute: (params) => __awaiter(this, void 0, void 0, function* () {
                yield this.browserManager.goBack();
                return { message: 'Navigated back in history.' };
            })
        });
        this.registry.register({
            name: 'goForward',
            description: 'Navigates forward in the browser history',
            parameters: {},
            execute: (params) => __awaiter(this, void 0, void 0, function* () {
                yield this.browserManager.goForward();
                return { message: 'Navigated forward in history.' };
            })
        });
        this.registry.register({
            name: 'newTab',
            description: 'Opens a new browser tab and switches to it. Can navigate to a URL.',
            parameters: {
                url: {
                    type: 'string',
                    required: false,
                    description: 'Optional URL to navigate to in the new tab.'
                }
            },
            execute: (params) => __awaiter(this, void 0, void 0, function* () {
                const { url } = params;
                yield this.browserManager.newTab(url);
                return { message: url ? `Opened new tab and navigated to ${url}` : 'Opened new tab' };
            })
        });
        this.registry.register({
            name: 'switchToTab',
            description: 'Switches to an existing browser tab by its 0-based index.',
            parameters: {
                index: {
                    type: 'number',
                    required: true,
                    description: 'The 0-based index of the tab to switch to.',
                    minimum: 0
                }
            },
            execute: (params) => __awaiter(this, void 0, void 0, function* () {
                const { index } = params;
                yield this.browserManager.switchToTab(index);
                return { message: `Switched to tab at index ${index}` };
            })
        });
        this.registry.register({
            name: 'closeTab',
            description: 'Closes the current or a specified browser tab.',
            parameters: {
                index: {
                    type: 'number',
                    required: false,
                    description: 'Optional 0-based index of the tab to close. Closes current tab if not specified.',
                    minimum: 0
                }
            },
            execute: (params) => __awaiter(this, void 0, void 0, function* () {
                const { index } = params;
                yield this.browserManager.closeTab(index);
                return { message: index !== undefined ? `Closed tab at index ${index}` : 'Closed current tab' };
            })
        });
        // --- Interaction Actions ---
        this.registry.register({
            name: 'click',
            description: 'Click an element by CSS selector',
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
            execute: (params) => __awaiter(this, void 0, void 0, function* () {
                const { selector, waitForSelector } = params;
                if (waitForSelector) {
                    yield this.browserManager.waitForSelector(selector);
                }
                yield this.browserManager.click(selector);
                return { message: `Clicked element: ${selector}` };
            })
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
            execute: (params) => __awaiter(this, void 0, void 0, function* () {
                const { selector, text, clearFirst } = params;
                if (clearFirst) {
                    yield this.browserManager.type(selector, ''); // Clear by typing empty string
                }
                yield this.browserManager.type(selector, text);
                return { message: `Typed "${text}" into ${selector}` };
            })
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
            execute: (params) => __awaiter(this, void 0, void 0, function* () {
                const { selector } = params;
                yield this.browserManager.scrollTo(selector);
                return { message: `Scrolled to element: ${selector}` };
            })
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
            execute: (params) => __awaiter(this, void 0, void 0, function* () {
                const { selector, value } = params;
                yield this.browserManager.selectOption(selector, value);
                return { message: `Selected option "${value}" in dropdown ${selector}.` };
            })
        });
        this.registry.register({
            name: 'uploadFile',
            description: 'Uploads a file to an <input type="file"> element.',
            parameters: {
                selector: {
                    type: 'string',
                    required: true,
                    description: 'The CSS selector of the file input element.'
                },
                filePath: {
                    type: 'string',
                    required: true,
                    description: 'The absolute path to the file to upload.'
                }
            },
            execute: (params) => __awaiter(this, void 0, void 0, function* () {
                const { selector, filePath } = params;
                yield this.browserManager.uploadFile(selector, filePath);
                return { message: `File ${filePath} uploaded to ${selector}.` };
            })
        });
        this.registry.register({
            name: 'dragAndDrop',
            description: 'Performs a drag-and-drop action from a source element to a target element.',
            parameters: {
                sourceSelector: {
                    type: 'string',
                    required: true,
                    description: 'The CSS selector of the element to drag.'
                },
                targetSelector: {
                    type: 'string',
                    required: true,
                    description: 'The CSS selector of the element to drop onto.'
                }
            },
            execute: (params) => __awaiter(this, void 0, void 0, function* () {
                const { sourceSelector, targetSelector } = params;
                yield this.browserManager.dragAndDrop(sourceSelector, targetSelector);
                return { message: `Dragged from ${sourceSelector} to ${targetSelector}.` };
            })
        });
        this.registry.register({
            name: 'handleDialog',
            description: 'Handles JavaScript dialogs (alerts, confirms, prompts) by accepting or dismissing them.',
            parameters: {
                accept: {
                    type: 'boolean',
                    required: false,
                    description: 'Whether to accept (true) or dismiss (false) the dialog (default: true).',
                    enum: [true, false]
                },
                promptText: {
                    type: 'string',
                    required: false,
                    description: 'Optional text to enter if the dialog is a prompt.'
                }
            },
            execute: (params) => __awaiter(this, void 0, void 0, function* () {
                const { accept, promptText } = params;
                yield this.browserManager.handleDialog(accept, promptText);
                return { message: `Dialog handler set: accept=${accept}, promptText=${promptText || 'N/A'}.` };
            })
        });
        // --- Data Extraction Actions ---
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
            execute: (params) => __awaiter(this, void 0, void 0, function* () {
                const { selector } = params;
                const text = yield this.browserManager.extractText(selector);
                return { text: text, message: `Extracted text from ${selector}` };
            })
        });
        this.registry.register({
            name: 'extractAttribute',
            description: 'Extracts the value of a specified HTML attribute from an element.',
            parameters: {
                selector: {
                    type: 'string',
                    required: true,
                    description: 'The CSS selector of the element.'
                },
                attribute: {
                    type: 'string',
                    required: true,
                    description: 'The name of the attribute to extract (e.g., "href", "value").'
                }
            },
            execute: (params) => __awaiter(this, void 0, void 0, function* () {
                const { selector, attribute } = params;
                const value = yield this.browserManager.extractAttribute(selector, attribute);
                return { attribute: attribute, value: value, message: `Extracted attribute "${attribute}" from ${selector}.` };
            })
        });
        this.registry.register({
            name: 'getPageHtml',
            description: 'Get the full HTML content of the current page',
            parameters: {},
            execute: (params) => __awaiter(this, void 0, void 0, function* () {
                const html = yield this.browserManager.getPageDomHtml();
                return { html: html, message: 'Full page HTML retrieved' };
            })
        });
        this.registry.register({
            name: 'getClickableElements',
            description: 'Get a list of all clickable elements on the current page.',
            parameters: {},
            execute: (params) => __awaiter(this, void 0, void 0, function* () {
                const clickableElements = yield this.browserManager.getClickableElementsDetails();
                return { elements: clickableElements, message: `Found ${clickableElements.length} clickable elements.` };
            })
        });
        this.registry.register({
            name: 'getAllVisibleTextNodes',
            description: 'Extracts all visible text nodes from the current page.',
            parameters: {},
            execute: (params) => __awaiter(this, void 0, void 0, function* () {
                const textNodes = yield this.browserManager.getAllVisibleTextNodes();
                return { textNodes: textNodes, message: `Found ${textNodes.length} visible text nodes.` };
            })
        });
        this.registry.register({
            name: 'screenshot',
            description: 'Take a screenshot of the current page',
            parameters: {
                path: {
                    type: 'string',
                    required: false,
                    description: 'Optional path to save the screenshot (e.g., "screenshots/my_screenshot.png"). If not provided, returns base64 string.',
                    pattern: '^.+\\.(png|jpeg|jpg)$' // Basic file extension check
                },
                fullPage: {
                    type: 'boolean',
                    required: false,
                    description: 'Whether to take a screenshot of the full scrollable page (default: false)',
                    enum: [true, false]
                }
            },
            execute: (params) => __awaiter(this, void 0, void 0, function* () {
                const { path, fullPage } = params;
                const base64Image = yield this.browserManager.screenshot(path, fullPage);
                return { message: path ? `Screenshot saved to ${path}` : 'Screenshot captured as base64', image: base64Image };
            })
        });
        // --- Debugging/Advanced Actions ---
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
            execute: (params) => __awaiter(this, void 0, void 0, function* () {
                const { scriptPath, options } = params;
                yield this.browserManager.highlightDomTreeElements(scriptPath, options || {});
                return { message: 'Elements highlighted successfully.' };
            })
        });
        this.registry.register({
            name: 'removeHighlights',
            description: 'Remove all active highlights from the page.',
            parameters: {},
            execute: (params) => __awaiter(this, void 0, void 0, function* () {
                yield this.browserManager.removeHighlights();
                return { message: 'All highlights removed from the page.' };
            })
        });
        this.registry.register({
            name: 'getCookies',
            description: 'Retrieves all cookies for the current browser context.',
            parameters: {},
            execute: (params) => __awaiter(this, void 0, void 0, function* () {
                const cookies = yield this.browserManager.getCookies();
                return { cookies: cookies, message: `Retrieved ${cookies.length} cookies.` };
            })
        });
        this.registry.register({
            name: 'setCookie',
            description: 'Sets a cookie in the current browser context.',
            parameters: {
                cookie: {
                    type: 'object',
                    required: true,
                    description: 'The cookie object to set (e.g., { name: "mycookie", value: "myvalue", url: "http://example.com" }).',
                    properties: {
                        name: { type: 'string', required: true, description: 'Cookie name' },
                        value: { type: 'string', required: true, description: 'Cookie value' },
                        url: { type: 'string', required: false, description: 'Cookie URL (required if domain/path not set)' },
                        domain: { type: 'string', required: false, description: 'Cookie domain' },
                        path: { type: 'string', required: false, description: 'Cookie path' },
                        expires: { type: 'number', required: false, description: 'Expiration date as Unix timestamp' },
                        httpOnly: { type: 'boolean', required: false, description: 'HttpOnly flag' },
                        secure: { type: 'boolean', required: false, description: 'Secure flag' },
                        sameSite: { type: 'string', required: false, description: 'SameSite attribute ("Strict", "Lax", "None")', enum: ["Strict", "Lax", "None"] }
                    }
                }
            },
            execute: (params) => __awaiter(this, void 0, void 0, function* () {
                const { cookie } = params;
                yield this.browserManager.setCookie(cookie);
                return { message: `Cookie "${cookie.name}" set.` };
            })
        });
        this.registry.register({
            name: 'clearCookies',
            description: 'Clears all cookies from the current browser context.',
            parameters: {},
            execute: (params) => __awaiter(this, void 0, void 0, function* () {
                yield this.browserManager.clearCookies();
                return { message: 'All cookies cleared.' };
            })
        });
        this.registry.register({
            name: 'getLocalStorage',
            description: 'Retrieves a value from the current page\'s localStorage.',
            parameters: {
                key: {
                    type: 'string',
                    required: true,
                    description: 'The key of the item to retrieve.'
                }
            },
            execute: (params) => __awaiter(this, void 0, void 0, function* () {
                const { key } = params;
                const value = yield this.browserManager.getLocalStorage(key);
                return { key: key, value: value, message: `Retrieved localStorage key "${key}".` };
            })
        });
        this.registry.register({
            name: 'setLocalStorage',
            description: 'Sets a key-value pair in the current page\'s localStorage.',
            parameters: {
                key: {
                    type: 'string',
                    required: true,
                    description: 'The key to set.'
                },
                value: {
                    type: 'string',
                    required: true,
                    description: 'The value to set.'
                }
            },
            execute: (params) => __awaiter(this, void 0, void 0, function* () {
                const { key, value } = params;
                yield this.browserManager.setLocalStorage(key, value);
                return { message: `Set localStorage key "${key}" to "${value}".` };
            })
        });
        this.registry.register({
            name: 'clearLocalStorage',
            description: 'Clears all data from the current page\'s localStorage for its origin.',
            parameters: {},
            execute: (params) => __awaiter(this, void 0, void 0, function* () {
                yield this.browserManager.clearLocalStorage();
                return { message: 'localStorage cleared.' };
            })
        });
        this.registry.register({
            name: 'clearSessionStorage',
            description: 'Clears all data from the current page\'s sessionStorage for its origin.',
            parameters: {},
            execute: (params) => __awaiter(this, void 0, void 0, function* () {
                yield this.browserManager.clearSessionStorage();
                return { message: 'sessionStorage cleared.' };
            })
        });
        // --- Agent Control / Completion Action ---
        this.registry.register({
            name: 'done',
            description: 'Indicates the task is completed or cannot proceed. Should be the last action.',
            parameters: {
                success: {
                    type: 'boolean',
                    required: true,
                    description: 'True if the task was successfully completed, false otherwise.'
                },
                text: {
                    type: 'string',
                    required: true,
                    description: 'A summary of the outcome or why the task could not be completed.'
                }
            },
            execute: (params) => __awaiter(this, void 0, void 0, function* () {
                // This action primarily signals completion. It doesn't perform a browser action itself.
                // The `is_done: true` flag in the return value is crucial for the AgentService.
                return { message: `Task finished: ${params.text}`, is_done: true };
            })
        });
        logger.info('Default actions registered successfully.');
    }
    /**
     * Executes a registered action by its name with provided parameters.
     * This method handles action validation, execution, and logs the result
     * to the action history.
     * @param actionName The name of the action to execute.
     * @param parameters An object containing the parameters for the action.
     * @returns A Promise that resolves with an `ActionResult` object.
     */
    executeAction(actionName_1) {
        return __awaiter(this, arguments, void 0, function* (actionName, parameters = {}) {
            const startTime = Date.now(); // Record start time for duration calculation
            const timestamp = new Date(); // Record timestamp
            // Ensure browser is launched before executing any action that requires it,
            // except for the 'init' action itself (which launches the browser).
            if (!this.isBrowserLaunched && actionName !== 'init') {
                const errorMsg = 'Browser is not launched. Call "init()" first.';
                const actionResult = {
                    success: false,
                    action: actionName,
                    parameters,
                    error: errorMsg,
                    timestamp,
                    duration: 0
                };
                this.actionHistory.push(actionResult); // Log the failure to history
                logger.error(`❌ Action "${actionName}" failed: ${errorMsg}`);
                return actionResult; // Return the failed result
            }
            try {
                // Delegate to the ActionRegistry to validate and execute the action.
                // The `executeAction` method of registry will handle parameter validation.
                const result = yield this.registry.executeAction(actionName, parameters);
                const duration = Date.now() - startTime; // Calculate duration
                // Check if the action explicitly signaled completion (e.g., the 'done' action)
                const isDone = typeof result.is_done === 'boolean' ? result.is_done : false;
                const actionResult = {
                    success: true,
                    action: actionName,
                    parameters,
                    result, // The actual result returned by the action's execute function
                    timestamp,
                    duration,
                    is_done: isDone // Include the completion flag
                };
                this.actionHistory.push(actionResult); // Add successful result to history
                logger.info(`✅ Action "${actionName}" executed successfully in ${duration}ms.`);
                return actionResult; // Return the successful result
            }
            catch (error) {
                const duration = Date.now() - startTime; // Calculate duration even on error
                const actionResult = {
                    success: false,
                    action: actionName,
                    parameters,
                    error: error.message, // Capture the error message
                    timestamp,
                    duration
                };
                this.actionHistory.push(actionResult); // Add failed result to history
                logger.error(`❌ Action "${actionName}" failed: ${error.message}`);
                return actionResult; // Return the failed result
            }
        });
    }
    /**
     * Retrieves a list of all available action definitions.
     * @returns An array of `ActionDefinition` objects.
     */
    getAvailableActions() {
        return this.registry.getAll();
    }
    /**
     * Retrieves the schema of all registered actions, suitable for documentation
     * or for LLMs to understand available tools.
     * @returns An array of objects describing each action's name, description, and parameters.
     */
    getActionsSchema() {
        return this.registry.getActionsSchema();
    }
    /**
     * Public method to expose ActionRegistry's getPromptDescription.
     * Generates a human-readable description of available actions for LLM context.
     * @param page Optional Playwright `Page` object to potentially filter actions.
     * @returns A string describing the available actions.
     */
    getPromptDescription(page) {
        return this.registry.getPromptDescription(page);
    }
    /**
     * Public method to expose ActionRegistry's createActionModel.
     * Creates a factory (constructor) for `ActionModel` instances.
     * @param options Optional settings for creating the action model.
     * @returns A constructor function for the `ActionModel` class.
     */
    createActionModel(options) {
        return this.registry.createActionModel(options);
    }
    /**
     * Finds action names that accept a specific parameter or set of parameters.
     * This can be used for dynamic action discovery.
     * @param queryParams An object where keys are parameter names and values are their types or specific values.
     * @returns An array of action names that match the query.
     */
    findActionsByParameter(queryParams) {
        return this.registry.findActionByParameter(queryParams);
    }
    /**
     * Registers a custom action with the ActionRegistry.
     * @param action The `ActionDefinition` object for the custom action.
     * @param overwrite If true, allows overwriting an existing action with the same name (default: false).
     */
    registerCustomAction(action, overwrite = false) {
        this.registry.register(action, overwrite);
        logger.info(`Custom action "${action.name}" registered.`);
    }
    /**
     * Removes a custom action from the ActionRegistry.
     * @param actionName The name of the action to remove.
     * @returns True if the action was removed, false if it was not found.
     */
    removeCustomAction(actionName) {
        const removed = this.registry.remove(actionName);
        if (removed) {
            logger.info(`Custom action "${actionName}" removed.`);
        }
        return removed;
    }
    /**
     * Retrieves the history of executed actions.
     * Returns a shallow copy to prevent external modification of the internal history array.
     * @returns An array of `ActionResult` objects.
     */
    getActionHistory() {
        return [...this.actionHistory];
    }
    /**
     * Clears the entire action history.
     */
    clearActionHistory() {
        this.actionHistory = [];
        logger.info('Action history cleared.');
    }
}
exports.Controller = Controller;
