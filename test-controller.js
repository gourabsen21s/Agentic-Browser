"use strict";
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
const BrowserManager_1 = require("./src/browser/BrowserManager");
const Controller_1 = require("./src/controller/Controller");
function testController() {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = new BrowserManager_1.BrowserManager();
        const controller = new Controller_1.Controller(browser);
        try {
            // 1. Launch browser
            yield controller.init(false);
            // 2. Test navigation
            const gotoResult = yield controller.executeAction('goto', { url: 'https://www.wikipedia.org' });
            console.log('Goto:', gotoResult);
            // 3. Wait for body
            const waitResult = yield controller.executeAction('waitForSelector', { selector: 'body' });
            console.log('Wait for selector:', waitResult);
            // 4. Get clickable elements
            const clickablesResult = yield controller.executeAction('getClickableElements', {});
            console.log('Clickable elements:', clickablesResult);
            // 5. Highlight elements
            const highlightResult = yield controller.executeAction('highlightElements', {
                scriptPath: 'src/dom/buildDomTree.js',
                options: { doHighlightElements: true }
            });
            console.log('Highlight:', highlightResult);
            // 6. Screenshot
            const screenshotResult = yield controller.executeAction('screenshot', { path: 'test_screenshot.png' });
            console.log('Screenshot:', screenshotResult);
            // 7. Extract text from an element
            const extractResult = yield controller.executeAction('extractText', { selector: 'h1' });
            console.log('Extract text:', extractResult);
            // 8. Custom action (if registered)
            // const customResult = await controller.executeAction('customAction', { ... });
            // console.log('Custom action:', customResult);
            // 9. List available actions
            console.log('Available actions:', controller.getAvailableActions().map(a => a.name));
            // 10. Print action history
            console.log('Action history:', controller.getActionHistory());
        }
        catch (error) {
            console.error('Test failed:', error);
        }
        finally {
            // 11. Shutdown
            yield controller.shutdown();
        }
    });
}
testController();
