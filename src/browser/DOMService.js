"use strict";
// src/browser/DOMService.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.DOMService = void 0;
const fs = __importStar(require("fs"));
const logger_1 = require("../shared/logger"); // Import your custom logger
const logger = (0, logger_1.getLogger)('DOMService'); // Get a logger instance for this service
/**
 * Provides methods for interacting with the web page's DOM using Playwright.
 * This includes extracting HTML content, identifying interactive elements,
 * and injecting scripts for advanced DOM manipulation (e.g., highlighting).
 */
class DOMService {
    /**
     * The Playwright Page instance that this service will operate on.
     */
    constructor(page) {
        this.page = page;
        if (!page) {
            throw new Error('DOMService requires a Playwright Page instance.');
        }
    }
    /**
     * Extracts the full HTML content of the current page.
     * @returns A Promise that resolves with the full HTML as a string.
     * @throws An error if Playwright fails to retrieve the page content.
     */
    getDomHtml() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const html = yield this.page.content(); // Playwright's method to get page HTML
                logger.debug('Successfully extracted full DOM HTML.');
                return html;
            }
            catch (error) {
                logger.error('Failed to extract full DOM HTML:', error);
                throw new Error(`Failed to extract full DOM HTML: ${error.message || error}`);
            }
        });
    }
    /**
     * Retrieves a list of all clickable/interactive elements on the current page.
     * Each element object includes its CSS selector, bounding box, tag name, text content, and attributes.
     * @returns A Promise that resolves with an array of `ClickableElement` objects.
     * @throws An error if the Playwright evaluation fails.
     */
    getClickableElements() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Execute JavaScript directly in the browser context to find elements
                const elements = yield this.page.evaluate(() => {
                    // Query for common interactive elements that users typically click or interact with.
                    const interactiveElements = Array.from(document.querySelectorAll('a, button, [role="button"], input[type="submit"], input[type="button"], [onclick], [tabindex]:not([tabindex="-1"])'));
                    return interactiveElements.map((el, idx) => {
                        const rect = el.getBoundingClientRect(); // Get the size and position of the element
                        const tagName = el.tagName.toLowerCase(); // Get the HTML tag name (e.g., 'a', 'div')
                        let selector = tagName; // Start with the tag name as the base selector
                        // Prioritize more stable and unique selectors: ID, then class names.
                        if (el.id) {
                            selector += `#${el.id}`; // Append ID if available
                        }
                        else if (el.className) {
                            selector += `.${Array.from(el.classList).join('.')}`; // Append all class names, joined by '.'
                        }
                        else {
                            // Fallback to a more robust `nth-of-type` selector if no unique ID or class
                            const parent = el.parentElement;
                            if (parent) {
                                const siblings = Array.from(parent.children);
                                // Filter siblings to only count those with the same tag name
                                const sameTagSiblings = siblings.filter(sibling => sibling.tagName === el.tagName);
                                // Find the 1-based index of the current element among its same-tag siblings
                                const indexInSameTag = sameTagSiblings.indexOf(el) + 1;
                                selector = `${parent.tagName.toLowerCase()} > ${el.tagName.toLowerCase()}:nth-of-type(${indexInSameTag})`;
                            }
                            else {
                                // Very last resort: a generic nth-of-type if the element has no parent (e.g., html or body)
                                selector += `:nth-of-type(${idx + 1})`;
                            }
                        }
                        // Extract all HTML attributes of the element
                        const attributes = {};
                        for (const attr of el.getAttributeNames()) {
                            attributes[attr] = el.getAttribute(attr) || '';
                        }
                        // Return the structured ClickableElement object
                        return {
                            selector,
                            boundingBox: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
                            tagName,
                            text: (el.textContent || '').trim(), // Get trimmed text content
                            attributes,
                            index: idx, // A simple sequential index for agent reference
                        };
                    });
                });
                logger.debug(`Found ${elements.length} clickable elements.`);
                return elements;
            }
            catch (error) {
                logger.error('Failed to get clickable elements:', error);
                throw new Error(`Failed to get clickable elements: ${error.message || error}`);
            }
        });
    }
    /**
     * Injects a JavaScript script from a file into the web page's context.
     * This is typically used for injecting helper scripts or DOM manipulation logic.
     * After injection, it can optionally call a function within that script.
     * @param scriptPath The absolute file path to the JavaScript script.
     * @param args Optional arguments to pass to the script's function (e.g., `window.myFunction(args)`).
     * @throws An error if the script file is not found, or if Playwright fails to inject/evaluate.
     */
    highlightDomTree(scriptPath_1) {
        return __awaiter(this, arguments, void 0, function* (scriptPath, args = {}) {
            if (!scriptPath || typeof scriptPath !== 'string') {
                throw new Error('Invalid scriptPath provided. Must be a non-empty string.');
            }
            // Ensure the script file exists before attempting to read it
            if (!fs.existsSync(scriptPath)) {
                throw new Error(`Script file not found: ${scriptPath}`);
            }
            try {
                const script = fs.readFileSync(scriptPath, 'utf8'); // Read the script file content
                yield this.page.addScriptTag({ content: script }); // Inject the script content into the page
                yield this.page.evaluate((evalArgs) => {
                    // Assume the injected script exposes a global function (e.g., `window.buildDomTree`)
                    if (typeof window.buildDomTree === 'function') {
                        window.buildDomTree(evalArgs); // Call the function with provided arguments
                    }
                    else {
                        // If the function isn't found, it's an issue with the script or its execution
                        throw new Error('window.buildDomTree function not found after script injection. Ensure the script defines it.');
                    }
                }, args);
                logger.debug(`DOM tree highlighting script "${scriptPath}" executed.`);
            }
            catch (error) {
                logger.error(`Failed to highlight DOM tree using script "${scriptPath}":`, error);
                throw new Error(`Failed to highlight DOM tree: ${error.message || error}`);
            }
        });
    }
    /**
     * Injects a JavaScript script and calls a function within it to extract a structured
     * representation of the DOM tree. This structured tree can be used for advanced
     * element identification or debugging.
     * @param scriptPath The absolute file path to the JavaScript script that builds the DOM tree.
     * @param args Optional arguments to pass to the script's DOM tree building function.
     * @returns A Promise that resolves with a `DomTreeResult` object, or `null` if the script
     * does not return a valid structured tree.
     * @throws An error if the script file is not found, or if Playwright fails to inject/evaluate.
     */
    getStructuredDomTree(scriptPath_1) {
        return __awaiter(this, arguments, void 0, function* (scriptPath, args = {}) {
            if (!scriptPath || typeof scriptPath !== 'string') {
                throw new Error('Invalid scriptPath provided. Must be a non-empty string.');
            }
            if (!fs.existsSync(scriptPath)) {
                throw new Error(`Script file not found: ${scriptPath}`);
            }
            try {
                const script = fs.readFileSync(scriptPath, 'utf8');
                yield this.page.addScriptTag({ content: script });
                const result = yield this.page.evaluate((evalArgs) => {
                    // Assume the script makes `window.buildDomTree` available
                    if (typeof window.buildDomTree === 'function') {
                        return window.buildDomTree(evalArgs);
                    }
                    return null;
                }, args);
                if (result) {
                    logger.debug(`Structured DOM tree extracted using script "${scriptPath}".`);
                }
                else {
                    logger.warn(`Script "${scriptPath}" executed, but did not return a structured DOM tree (buildDomTree function might not return a value or might have failed internally).`);
                }
                return result;
            }
            catch (error) {
                logger.error(`Failed to get structured DOM tree using script "${scriptPath}":`, error);
                throw new Error(`Failed to get structured DOM tree: ${error.message || error}`);
            }
        });
    }
    /**
     * Retrieves an element's data from a previously generated structured DOM tree
     * by its unique highlight index.
     * @param scriptPath The path to the script used to build the DOM tree (needed to regenerate if not cached).
     * @param index The highlight index of the element to find.
     * @param args Arguments passed to the script's `buildDomTree` function.
     * @returns A Promise that resolves with the element's data object from the DOM tree map,
     * or `null` if the element is not found or the DOM tree cannot be generated.
     * @throws An error if script path is invalid or DOM tree generation fails.
     */
    getElementByIndex(scriptPath_1, index_1) {
        return __awaiter(this, arguments, void 0, function* (scriptPath, index, args = {}) {
            if (typeof index !== 'number' || index < 0) {
                throw new Error('Invalid index provided. Must be a non-negative number.');
            }
            if (!scriptPath || typeof scriptPath !== 'string') {
                throw new Error('Invalid scriptPath provided. Must be a non-empty string.');
            }
            try {
                // Re-generate the structured DOM tree to ensure it's up-to-date
                const domTree = yield this.getStructuredDomTree(scriptPath, args);
                if (!domTree || !domTree.map) {
                    logger.warn('Could not retrieve a valid structured DOM tree to find element by index.');
                    return null;
                }
                // Iterate through the map to find the element by its `highlightIndex` property
                for (const key in domTree.map) {
                    if (Object.prototype.hasOwnProperty.call(domTree.map, key)) {
                        const node = domTree.map[key];
                        if (node && node.highlightIndex === index) {
                            logger.debug(`Found element with highlight index ${index}.`);
                            return node;
                        }
                    }
                }
                logger.warn(`Element with highlight index ${index} not found in the DOM tree.`);
                return null;
            }
            catch (error) {
                logger.error(`Failed to get element by index ${index}:`, error);
                throw new Error(`Failed to get element by index ${index}: ${error.message || error}`);
            }
        });
    }
    /**
     * Extracts all visible text nodes from the current page.
     * Each result includes the text content and a CSS selector for its parent element.
     * @returns A Promise that resolves with an array of objects containing `text` and `parentSelector`.
     * @throws An error if the Playwright evaluation fails.
     */
    getAllVisibleTextNodes() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const results = yield this.page.evaluate(() => {
                    // Helper function to determine if a DOM element is visible on the page.
                    function isVisible(el) {
                        const htmlEl = el; // Cast to HTMLElement to access offsetWidth/offsetHeight
                        const style = window.getComputedStyle(htmlEl);
                        // An element is considered visible if it's not hidden by display/visibility styles
                        // and has a non-zero width and height.
                        return style && style.display !== 'none' && style.visibility !== 'hidden' && htmlEl.offsetWidth > 0 && htmlEl.offsetHeight > 0;
                    }
                    const textNodes = []; // Array to store results
                    // Recursive function to traverse the DOM tree.
                    function walk(node) {
                        // Check if the current node is a text node with actual content.
                        if (node.nodeType === Node.TEXT_NODE && node.textContent && node.textContent.trim()) {
                            const parent = node.parentElement; // Get the parent element of the text node.
                            // If the parent exists and is visible, extract its text and generate a selector.
                            if (parent && isVisible(parent)) {
                                let selector = parent.tagName.toLowerCase(); // Start with the parent's tag name.
                                // Generate a robust CSS selector for the parent element, prioritizing unique IDs and classes.
                                if (parent.id) {
                                    selector += `#${parent.id}`;
                                }
                                else if (parent.className) {
                                    selector += `.${Array.from(parent.classList).join('.')}`;
                                }
                                else {
                                    // Fallback to `nth-of-type` if no unique ID or class is available,
                                    // to make the selector more specific within its parent's children.
                                    const parentOfParent = parent.parentElement;
                                    if (parentOfParent) {
                                        const siblings = Array.from(parentOfParent.children);
                                        const sameTagSiblings = siblings.filter(sibling => sibling.tagName === parent.tagName);
                                        const indexInSameTag = sameTagSiblings.indexOf(parent) + 1;
                                        selector = `${parentOfParent.tagName.toLowerCase()} > ${parent.tagName.toLowerCase()}:nth-of-type(${indexInSameTag})`;
                                    }
                                    else {
                                        // Fallback for top-level elements without a direct parent or unique identifiers.
                                        // This is less specific but provides a selector.
                                        selector = `${parent.tagName.toLowerCase()}:nth-of-type(${Array.from(document.querySelectorAll(parent.tagName.toLowerCase())).indexOf(parent) + 1})`;
                                    }
                                }
                                textNodes.push({ text: node.textContent.trim(), parentSelector: selector });
                            }
                        }
                        else if (node.nodeType === Node.ELEMENT_NODE) {
                            // If it's an element node, recursively call walk for all its child nodes.
                            for (const child of Array.from(node.childNodes)) {
                                walk(child);
                            }
                        }
                    }
                    walk(document.body); // Start the DOM traversal from the document body.
                    return textNodes;
                });
                logger.debug(`Extracted ${results.length} visible text nodes.`);
                return results;
            }
            catch (error) {
                logger.error('Failed to get all visible text nodes:', error);
                throw new Error(`Failed to get all visible text nodes: ${error.message || error}`);
            }
        });
    }
    /**
     * Removes all highlights, overlays, or injected inline styles that were added to the page
     * by the agent (e.g., during element highlighting).
     * This cleans up the UI for subsequent interactions or for the user.
     * @returns A Promise that resolves when highlights are removed.
     * @throws An error if the Playwright evaluation fails.
     */
    removeHighlights() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.page.evaluate(() => {
                    try {
                        // Attempt to remove a main container div that might hold highlights
                        const container = document.getElementById('playwright-highlight-container');
                        if (container)
                            container.remove();
                        // Remove custom attributes that were added to elements for highlighting identification
                        const highlightedElements = document.querySelectorAll('[browser-user-highlight-id^="playwright-highlight-"]');
                        highlightedElements.forEach(el => {
                            el.removeAttribute('browser-user-highlight-id');
                        });
                        // Remove inline styles that were potentially added for visual highlights (e.g., outlines, shadows)
                        const inlineStyledElements = document.querySelectorAll('[style*="outline:"]'); // Elements with inline 'outline' style
                        inlineStyledElements.forEach(el => {
                            el.style.removeProperty('outline'); // Remove the outline property
                            el.style.removeProperty('outline-offset'); // Remove outline offset
                            el.style.removeProperty('box-shadow'); // Remove box shadow if used for highlighting
                        });
                    }
                    catch (e) {
                        // Log any errors occurring within the browser's context during cleanup, but don't stop execution.
                        console.warn('Error during in-page highlight removal (ignored):', e);
                    }
                });
                logger.debug('Highlights removed from the page.');
            }
            catch (error) {
                logger.error('Failed to remove highlights:', error);
                throw new Error(`Failed to remove highlights: ${error.message || error}`);
            }
        });
    }
}
exports.DOMService = DOMService;
