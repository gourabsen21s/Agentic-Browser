// src/dom/HistoryTreeProcessorService.ts

import { DOMHistoryElement } from '../shared/types'; // Import DOMHistoryElement from your shared types
import { getLogger } from '../shared/logger'; // Import your custom logger

const logger = getLogger('HistoryTreeProcessorService'); // Get a logger instance for this service

/**
 * Provides utilities for processing and comparing DOM trees, specifically for
 * finding historical DOM elements within a current page's DOM structure.
 * This is crucial for replaying actions accurately if the DOM has changed slightly.
 */
export class HistoryTreeProcessor {
  /**
   * Finds a historical `DOMHistoryElement` within the current browser state's
   * selector map by comparing their `branch_path_hash`. This hash is assumed
   * to be a unique identifier derived from the element's position and attributes
   * in the DOM tree, allowing for robust re-identification even if indices change.
   *
   * @param historicalElement The `DOMHistoryElement` object representing the element
   * from a past browser state (e.g., from agent history).
   * @param currentSelectorMap A `Record` (or map) where keys are highlight_indices
   * and values are `DOMHistoryElement` objects from the
   * current page's DOM.
   * @returns The matching `DOMHistoryElement` from the current tree if found, otherwise `null`.
   */
  static findHistoryElementInTree(
    historicalElement: DOMHistoryElement,
    currentSelectorMap: Record<string, DOMHistoryElement>
  ): DOMHistoryElement | null {
    // Basic validation to ensure we have valid input to work with
    if (!historicalElement || !historicalElement.hash || !historicalElement.hash.branch_path_hash || !currentSelectorMap) {
      logger.warn('Invalid historical element or current selector map provided for lookup.');
      return null;
    }

    const historicalHash = historicalElement.hash.branch_path_hash; // Get the unique hash of the historical element

    // Iterate through the `currentSelectorMap` to find an element whose hash matches the historical one.
    // Assuming `currentSelectorMap` is indexed by `highlight_index` or some other ID,
    // but we are searching by the `branch_path_hash` within each element.
    for (const index in currentSelectorMap) {
      const currentElement = currentSelectorMap[index];
      // Check if the current element exists and has a matching hash
      if (currentElement.hash && currentElement.hash.branch_path_hash === historicalHash) {
        logger.debug(`Found matching element by hash: ${historicalHash} at new index ${currentElement.highlight_index}`);
        return currentElement; // Return the found element
      }
    }

    // If the loop completes without finding a match, log a warning and return null.
    logger.warn(`No matching element found for historical hash: ${historicalHash} in current DOM.`);
    return null;
  }

  // You can extend this class with more advanced DOM tree processing utilities as needed, such as:
  // - `diffDomTrees(oldTree, newTree)`: To find changes between two DOM states.
  // - `generateXPath(element)`: To create a robust XPath for an element.
  // - `generateCSSSelector(element)`: To create a robust CSS selector.
  // - Methods for building the `branch_path_hash` itself from a Playwright element handle.
}