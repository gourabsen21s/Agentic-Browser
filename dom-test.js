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
// src/test-integration.ts
const BrowserManager_1 = require("./src/browser/BrowserManager");
function testIntegration() {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = new BrowserManager_1.BrowserManager();
        try {
            // Launch browser
            yield browser.launch(false);
            console.log('✅ Browser launched');
            // Test on LinkedIn (CSP-protected site)
            yield browser.goto('https://www.linkedin.com');
            yield browser.waitForSelector('body');
            console.log('✅ Navigated to LinkedIn');
            // Test DOMService methods
            console.log('\n--- Testing DOMService Methods ---');
            const clickables = yield browser.getClickableElementsDetails();
            console.log(`✅ Found ${clickables.length} clickable elements`);
            const domHtml = yield browser.getPageDomHtml();
            console.log(`✅ DOM HTML length: ${domHtml.length} characters`);
            yield browser.highlightDomTreeElements('src/dom/buildDomTree.js', {
                doHighlightElements: true,
                focusHighlightIndex: -1,
                viewportExpansion: 0,
                debugMode: false,
            });
            console.log('✅ DOM highlighting applied');
            const domTree = yield browser.getStructuredDomTree('src/dom/buildDomTree.js', {
                doHighlightElements: false,
                debugMode: true,
            });
            console.log('✅ Structured DOM tree extracted');
            const textNodes = yield browser.getAllVisibleTextNodes();
            console.log(`✅ Found ${textNodes.length} visible text nodes`);
            // Test tab management
            console.log('\n--- Testing Tab Management ---');
            yield browser.newTab('https://www.google.com');
            console.log('✅ New tab opened');
            const googleClickables = yield browser.getClickableElementsDetails();
            console.log(`✅ Google: Found ${googleClickables.length} clickable elements`);
            yield browser.switchToTab(0);
            console.log('✅ Switched back to first tab');
            // Take screenshot
            yield browser.screenshot('integration_test.png');
            console.log('✅ Screenshot saved');
            console.log('\n🎉 All integration tests passed!');
            // Keep browser open for inspection
            yield new Promise(resolve => setTimeout(resolve, 10000));
        }
        catch (error) {
            console.error('❌ Integration test failed:', error);
        }
        finally {
            yield browser.close();
        }
    });
}
testIntegration();
