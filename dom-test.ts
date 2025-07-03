// src/test-integration.ts
import { BrowserManager } from './src/browser/BrowserManager';

async function testIntegration() {
  const browser = new BrowserManager();

  try {
    // Launch browser
    await browser.launch(false);
    console.log('✅ Browser launched');

    // Test on LinkedIn (CSP-protected site)
    await browser.goto('https://www.linkedin.com');
    await browser.waitForSelector('body');
    console.log('✅ Navigated to LinkedIn');

    // Test DOMService methods
    console.log('\n--- Testing DOMService Methods ---');
    
    const clickables = await browser.getClickableElementsDetails();
    console.log(`✅ Found ${clickables.length} clickable elements`);

    const domHtml = await browser.getPageDomHtml();
    console.log(`✅ DOM HTML length: ${domHtml.length} characters`);

    await browser.highlightDomTreeElements('src/dom/buildDomTree.js', {
      doHighlightElements: true,
      focusHighlightIndex: -1,
      viewportExpansion: 0,
      debugMode: false,
    });
    console.log('✅ DOM highlighting applied');

    const domTree = await browser.getStructuredDomTree('src/dom/buildDomTree.js', {
      doHighlightElements: false,
      debugMode: true,
    });
    console.log('✅ Structured DOM tree extracted');

    const textNodes = await browser.getAllVisibleTextNodes();
    console.log(`✅ Found ${textNodes.length} visible text nodes`);

    // Test tab management
    console.log('\n--- Testing Tab Management ---');
    await browser.newTab('https://www.google.com');
    console.log('✅ New tab opened');

    const googleClickables = await browser.getClickableElementsDetails();
    console.log(`✅ Google: Found ${googleClickables.length} clickable elements`);

    await browser.switchToTab(0);
    console.log('✅ Switched back to first tab');

    // Take screenshot
    await browser.screenshot('integration_test.png');
    console.log('✅ Screenshot saved');

    console.log('\n🎉 All integration tests passed!');

    // Keep browser open for inspection
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('❌ Integration test failed:', error);
  } finally {
    await browser.close();
  }
}

testIntegration();