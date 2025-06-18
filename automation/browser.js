const playwright = require('playwright');
const path = require('path');
const fs = require('fs/promises');

let browser;
let page;

async function launchBrowser(browserType = 'chromium', headless) {
    try {
        if(browser){
            console.log("[BROWSER] Browser already open, reusing existing instance");
            return browser;
        }
        console.log(`[BROWSER] Launching ${browserType} in ${headless ? 'headless' : 'headful'} mode...`);
        browser = await playwright[browserType].launch({headless});
        console.log('[BROWSER] Browser launched successfully.');
        return browser;
    } catch (error) {
        console.error('[BROWSER] Error launching browser:', error);
        throw error;
    }
}

async function getOrCreatePage() {
    try{
        if(!browser){
            await launchBrowser();
        }
        if(!page){
            console.log("[BROWSER] Creating new page");
            page = await browser.newPage();
            console.log("[BROWSER] New Page Created");
        }else{
            console.log("[BROWSER] Reusing Existing Page");
        }
        return page;
    }catch(error){
        console.error('[BROWSER] Error getting/creating page:', error);
        throw error;
    }
    
}

async function navigate(url) {
    try {
        const currentPage = await getOrCreatePage();
        console.log(`[BROWSER] Navigating to: ${url}`);
        await currentPage.goto(url, {waitUntil : "domcontentloaded"});
        console.log(`[BROWSER] Navigated to: ${url}`);

    } catch (error) {
        console.error(`[BROWSER] Error navigating to ${url}:`, error);
        throw error;
    }

}

async function takeScreenshotAndExtractDom() {
    try {
        const currentPage = await getOrCreatePage();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const screenshotName = `screenshot-${timestamp}.png`;
        const screenshotPath = path.join(__dirname, '..', 'logs', 'screenshots', screenshotName);

        await fs.mkdir(path.dirname(screenshotPath), { recursive: true });

        console.log(`[BROWSER] Taking screenshot: ${screenshotPath}`);
        await currentPage.screenshot({ path: screenshotPath, fullPage: true });

        console.log('[BROWSER] Extracting DOM content...');
        const htmlContent = await currentPage.content();

        // A more robust approach would involve iterating through specific elements
        // or using a dedicated library, but this gives us a starting point.
        const domElementsWithBbox = await currentPage.evaluate(() => {
            const elements = [];
            const querySelectors = 'a, button, input, select, textarea, label, h1, h2, h3, h4, h5, h6, p, li, span, div';
            document.querySelectorAll(querySelectors).forEach(el => {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0 && el.offsetParent !== null) {
                    const tagName = el.tagName.toLowerCase();
                    const id = el.id || '';
                    const className = el.className || '';
                    const textContent = el.innerText.trim(); 

                    elements.push({
                        tagName,
                        id,
                        className,
                        textContent,
                        bbox: {
                            x: rect.x,
                            y: rect.y,
                            width: rect.width,
                            height: rect.height,
                        },
                        selector: id ? `#${id}` : (className ? `.${className.split(' ')[0]}` : tagName) // Basic selector
                    });
                }
            });
            return elements;
        });

        console.log('[BROWSER] DOM content and bounding boxes extracted.');

        return {
            screenshotPath: screenshotPath,
            htmlContent: htmlContent,
            domElementsWithBbox: domElementsWithBbox
        };

    } catch (error) {
        console.error('[BROWSER] Error taking screenshot or extracting DOM:', error);
        throw error;
    }
}


async function closeBrowser() {
    try {
        if (browser) {
            await browser.close();
            browser = null;
            page = null; 
            console.log('[BROWSER] Browser closed.');
        }
    } catch (error) {
        console.error('[BROWSER] Error closing browser:', error);
    }
}

module.exports = {
    launchBrowser,
    navigate,
    takeScreenshotAndExtractDom,
    closeBrowser,
    getOrCreatePage 
};