import { Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

export interface ClickableElement {
  selector: string;
  boundingBox: { x: number; y: number; width: number; height: number } | null;
  tagName: string;
  text: string;
  attributes: Record<string, string>;
  index: number;
}

export interface DomTreeResult {
  rootId: string;
  map: Record<string, any>;
  perfMetrics?: any;
}

export class DOMService {
  constructor(private page: Page) {
    if (!page) {
      throw new Error('DOMService requires a Playwright Page instance.');
    }
  }

  async getDomHtml(): Promise<string> {
    try {
      const html = await this.page.content();
      console.log('Successfully extracted full DOM HTML.');
      return html;
    } catch (error: any) {
      console.error('Failed to extract full DOM HTML:', error);
      throw new Error(`Failed to extract full DOM HTML: ${error.message || error}`);
    }
  }

  async getClickableElements(): Promise<ClickableElement[]> {
    try {
      const elements = await this.page.evaluate(() => {
        const interactiveElements = Array.from(document.querySelectorAll(
          'a, button, [role="button"], input[type="submit"], input[type="button"], [onclick], [tabindex]:not([tabindex="-1"])'
        ));
        return interactiveElements.map((el, idx) => {
          const rect = el.getBoundingClientRect();
          const tagName = el.tagName.toLowerCase();
          let selector = tagName;
          if (el.id) selector += `#${el.id}`;
          else if (el.className) selector += `.${Array.from(el.classList).join('.')}`;
          else {
            const parent = el.parentElement;
            if (parent) {
              const siblings = Array.from(parent.children);
              const sameTagSiblings = siblings.filter(sibling => sibling.tagName === el.tagName);
              const indexInSameTag = sameTagSiblings.indexOf(el) + 1;
              selector = `${parent.tagName.toLowerCase()} > ${el.tagName.toLowerCase()}:nth-of-type(${indexInSameTag})`;
            } else {
              selector += `:nth-of-type(${idx + 1})`;
            }
          }

          const attributes: Record<string, string> = {};
          for (const attr of el.getAttributeNames()) {
            attributes[attr] = el.getAttribute(attr) || '';
          }
          return {
            selector,
            boundingBox: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
            tagName,
            text: (el.textContent || '').trim(),
            attributes,
            index: idx,
          };
        });
      });
      console.log(`Found ${elements.length} clickable elements.`);
      return elements;
    } catch (error: any) {
      console.error('Failed to get clickable elements:', error);
      throw new Error(`Failed to get clickable elements: ${error.message || error}`);
    }
  }

  async highlightDomTree(scriptPath: string, args: any = {}): Promise<void> {
    if (!scriptPath || typeof scriptPath !== 'string') {
      throw new Error('Invalid scriptPath provided. Must be a non-empty string.');
    }
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Script file not found: ${scriptPath}`);
    }

    try {
      const script = fs.readFileSync(scriptPath, 'utf8');
      await this.page.addScriptTag({ content: script });
      await this.page.evaluate((evalArgs) => {
        if (typeof (window as any).buildDomTree === 'function') {
          (window as any).buildDomTree(evalArgs);
        } else {
          throw new Error('window.buildDomTree function not found after script injection. Ensure the script defines it.');
        }
      }, args);
      console.log(`DOM tree highlighting script "${scriptPath}" executed.`);
    } catch (error: any) {
      console.error(`Failed to highlight DOM tree using script "${scriptPath}":`, error);
      throw new Error(`Failed to highlight DOM tree: ${error.message || error}`);
    }
  }

  async getStructuredDomTree(scriptPath: string, args: any = {}): Promise<DomTreeResult | null> {
    if (!scriptPath || typeof scriptPath !== 'string') {
      throw new Error('Invalid scriptPath provided. Must be a non-empty string.');
    }
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Script file not found: ${scriptPath}`);
    }

    try {
      const script = fs.readFileSync(scriptPath, 'utf8');
      await this.page.addScriptTag({ content: script });
      const result = await this.page.evaluate((evalArgs) => {
        if (typeof (window as any).buildDomTree === 'function') {
          return (window as any).buildDomTree(evalArgs);
        }
        return null;
      }, args);

      if (result) {
        console.log(`Structured DOM tree extracted using script "${scriptPath}".`);
      } else {
        console.warn(`Script "${scriptPath}" executed, but did not return a structured DOM tree (buildDomTree function might not return a value or might have failed internally).`);
      }
      return result;
    } catch (error: any) {
      console.error(`Failed to get structured DOM tree using script "${scriptPath}":`, error);
      throw new Error(`Failed to get structured DOM tree: ${error.message || error}`);
    }
  }

  async getElementByIndex(scriptPath: string, index: number, args: any = {}): Promise<any | null> {
    if (typeof index !== 'number' || index < 0) {
      throw new Error('Invalid index provided. Must be a non-negative number.');
    }
    if (!scriptPath || typeof scriptPath !== 'string') {
      throw new Error('Invalid scriptPath provided. Must be a non-empty string.');
    }

    try {
      const domTree = await this.getStructuredDomTree(scriptPath, args);
      if (!domTree || !domTree.map) {
        console.warn('Could not retrieve a valid structured DOM tree to find element by index.');
        return null;
      }

      for (const key in domTree.map) {
        if (Object.prototype.hasOwnProperty.call(domTree.map, key)) {
          const node = domTree.map[key];
          if (node && node.highlightIndex === index) {
            console.log(`Found element with highlight index ${index}.`);
            return node;
          }
        }
      }
      console.warn(`Element with highlight index ${index} not found in the DOM tree.`);
      return null;
    } catch (error: any) {
      console.error(`Failed to get element by index ${index}:`, error);
      throw new Error(`Failed to get element by index ${index}: ${error.message || error}`);
    }
  }

  async getAllVisibleTextNodes(): Promise<{ text: string; parentSelector: string }[]> {
    try {
      const results = await this.page.evaluate(() => {
        // Cast el to HTMLElement to access offsetWidth and offsetHeight
        function isVisible(el: Element): boolean {
          const htmlEl = el as HTMLElement; // Explicitly cast to HTMLElement
          const style = window.getComputedStyle(htmlEl);
          return style && style.display !== 'none' && style.visibility !== 'hidden' && htmlEl.offsetWidth > 0 && htmlEl.offsetHeight > 0;
        }

        const textNodes: { text: string; parentSelector: string }[] = [];

        function walk(node: Node) {
          if (node.nodeType === Node.TEXT_NODE && node.textContent && node.textContent.trim()) {
            const parent = node.parentElement;
            if (parent && isVisible(parent)) {
              let selector = parent.tagName.toLowerCase();
              if (parent.id) selector += `#${parent.id}`;
              else if (parent.className) selector += `.${Array.from(parent.classList).join('.')}`;
              else {
                const parentOfParent = parent.parentElement;
                if (parentOfParent) {
                  const siblings = Array.from(parentOfParent.children);
                  const sameTagSiblings = siblings.filter(sibling => sibling.tagName === parent.tagName);
                  const indexInSameTag = sameTagSiblings.indexOf(parent) + 1;
                  selector = `${parentOfParent.tagName.toLowerCase()} > ${parent.tagName.toLowerCase()}:nth-of-type(${indexInSameTag})`;
                } else {
                    selector = `${parent.tagName.toLowerCase()}:nth-of-type(${Array.from(document.querySelectorAll(parent.tagName.toLowerCase())).indexOf(parent) + 1})`;
                }
              }
              textNodes.push({ text: node.textContent.trim(), parentSelector: selector });
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            for (const child of Array.from(node.childNodes)) {
              walk(child);
            }
          }
        }
        walk(document.body);
        return textNodes;
      });
      console.log(`Extracted ${results.length} visible text nodes.`);
      return results;
    } catch (error: any) {
      console.error('Failed to get all visible text nodes:', error);
      throw new Error(`Failed to get all visible text nodes: ${error.message || error}`);
    }
  }

  async removeHighlights(): Promise<void> {
    try {
      await this.page.evaluate(() => {
        try {
          const container = document.getElementById('playwright-highlight-container');
          if (container) container.remove();
          const highlightedElements = document.querySelectorAll('[browser-user-highlight-id^="playwright-highlight-"]');
          highlightedElements.forEach(el => {
            el.removeAttribute('browser-user-highlight-id');
          });
          const inlineStyledElements = document.querySelectorAll('[style*="outline:"]');
          inlineStyledElements.forEach(el => {
              (el as HTMLElement).style.removeProperty('outline');
              (el as HTMLElement).style.removeProperty('outline-offset');
              (el as HTMLElement).style.removeProperty('box-shadow');
          });
        } catch (e) {
          console.warn('Error during in-page highlight removal (ignored):', e);
        }
      });
      console.log('Highlights removed from the page.');
    } catch (error: any) {
      console.error('Failed to remove highlights:', error);
      throw new Error(`Failed to remove highlights: ${error.message || error}`);
    }
  }
}