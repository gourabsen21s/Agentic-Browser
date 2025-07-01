import { BrowserManager } from './src/browser/BrowserManager';
import * as fs from 'fs';

async function main() {
  const browser = new BrowserManager();

  try {
    // Launch browser (set headless to false to see the browser window)
    await browser.launch(false);

    // Go to Wikipedia
    await browser.goto('https://www.wikipedia.org');

    // Wait for the search box to appear
    await browser.waitForSelector('input[name="search"]', 10000);

    // Type a query
    await browser.type('input[name="search"]', 'OpenAI');

    // Submit the search form (press Enter)
    await browser.evaluate(() => {
      const input = document.querySelector('input[name="search"]');
      if (input) (input as HTMLInputElement).form?.submit();
    });

    // Wait for the article heading to appear
    await browser.waitForSelector('h1', 10000);

    // Extract the article title
    const articleTitle = await browser.extractText('h1');
    console.log('Article title:', articleTitle);

    // Inject and call buildDomTree.js to highlight elements
    const scriptPath = 'src/dom/buildDomTree.js';
    await browser.injectScriptFromFile(scriptPath);
    await browser.evaluate(() => {
      // @ts-ignore
      if (typeof window.buildDomTree === 'function') {
        // @ts-ignore
        window.buildDomTree({
          doHighlightElements: true,
          focusHighlightIndex: -1,
          viewportExpansion: 0,
          debugMode: true,
        });
      } else {
        console.log('buildDomTree is not a function');
      }
    });

    // Wait so you can see the highlights
    await new Promise(res => setTimeout(res, 5000));

    // Take a screenshot
    await browser.screenshot('wikipedia_search.png');
    console.log('Screenshot saved as wikipedia_search.png');
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await browser.close();
  }
}

main();