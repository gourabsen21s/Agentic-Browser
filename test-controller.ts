import { BrowserManager } from './src/browser/BrowserManager';
import { Controller } from './src/controller/Controller';

async function testController() {
  const browser = new BrowserManager();
  const controller = new Controller(browser);

  try {
    // 1. Launch browser
    await controller.init(false);

    // 2. Test navigation
    const gotoResult = await controller.executeAction('goto', { url: 'https://www.wikipedia.org' });
    console.log('Goto:', gotoResult);

    // 3. Wait for body
    const waitResult = await controller.executeAction('waitForSelector', { selector: 'body' });
    console.log('Wait for selector:', waitResult);

    // 4. Get clickable elements
    const clickablesResult = await controller.executeAction('getClickableElements', {});
    console.log('Clickable elements:', clickablesResult);

    // 5. Highlight elements
    const highlightResult = await controller.executeAction('highlightElements', {
      scriptPath: 'src/dom/buildDomTree.js',
      options: { doHighlightElements: true }
    });
    console.log('Highlight:', highlightResult);

    // 6. Screenshot
    const screenshotResult = await controller.executeAction('screenshot', { path: 'test_screenshot.png' });
    console.log('Screenshot:', screenshotResult);

    // 7. Extract text from an element
    const extractResult = await controller.executeAction('extractText', { selector: 'h1' });
    console.log('Extract text:', extractResult);

    // 8. Custom action (if registered)
    // const customResult = await controller.executeAction('customAction', { ... });
    // console.log('Custom action:', customResult);

    // 9. List available actions
    console.log('Available actions:', controller.getAvailableActions().map(a => a.name));

    // 10. Print action history
    console.log('Action history:', controller.getActionHistory());

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // 11. Shutdown
    await controller.shutdown();
  }
}

testController();