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
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = new BrowserManager_1.BrowserManager();
        try {
            // Launch browser (set headless to false to see the browser window)
            yield browser.launch(false);
            // Go to Wikipedia
            yield browser.goto('https://www.wikipedia.org');
            // Wait for the search box to appear
            yield browser.waitForSelector('input[name="search"]', 10000);
            // Type a query
            yield browser.type('input[name="search"]', 'OpenAI');
            // Submit the search form (press Enter)
            yield browser.evaluate(() => {
                var _a;
                const input = document.querySelector('input[name="search"]');
                if (input)
                    (_a = input.form) === null || _a === void 0 ? void 0 : _a.submit();
            });
            // Wait for the article heading to appear
            yield browser.waitForSelector('h1', 10000);
            // Extract the article title
            const articleTitle = yield browser.extractText('h1');
            console.log('Article title:', articleTitle);
            // Inject and call buildDomTree.js to highlight elements
            const scriptPath = 'src/dom/buildDomTree.js';
            yield browser.injectScriptFromFile(scriptPath);
            yield browser.evaluate(() => {
                // @ts-ignore
                if (typeof window.buildDomTree === 'function') {
                    // @ts-ignore
                    window.buildDomTree({
                        doHighlightElements: true,
                        focusHighlightIndex: -1,
                        viewportExpansion: 0,
                        debugMode: true,
                    });
                }
                else {
                    console.log('buildDomTree is not a function');
                }
            });
            // Wait so you can see the highlights
            yield new Promise(res => setTimeout(res, 5000));
            // Take a screenshot
            yield browser.screenshot('wikipedia_search.png');
            console.log('Screenshot saved as wikipedia_search.png');
        }
        catch (err) {
            console.error('Test failed:', err);
        }
        finally {
            yield browser.close();
        }
    });
}
main();
