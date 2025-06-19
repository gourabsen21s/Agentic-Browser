const { getOrCreatePage } = require('./browser'); 

async function clickElement(selector) {
    try {
        const page = await getOrCreatePage();
        console.log(`[EXECUTE] Attempting to click element with selector: "${selector}"`);

        const element = await page.$(selector);
        if (element) {
            await element.click();
            console.log(`[EXECUTE] Successfully clicked element: "${selector}"`);
            return `Clicked element with selector: "${selector}"`;
        } else {
            console.warn(`[EXECUTE] Element not found for click: "${selector}"`);
            return `Error: Element not found with selector: "${selector}" for click action.`;
        }
    } catch (error) {
        console.error(`[EXECUTE] Error clicking element "${selector}":`, error);
        return `Error clicking element "${selector}": ${error.message}`;
    }
}

async function typeText(selector, text) {
    try {
        const page = await getOrCreatePage();
        console.log(`[EXECUTE] Attempting to type text "<span class="math-inline">\{text\}" into selector\: "</span>{selector}"`);

        const element = await page.$(selector);
        if (element) {
            await element.fill(text); 
            console.log(`[EXECUTE] Successfully typed text into: "${selector}"`);
            return `Typed "<span class="math-inline">\{text\}" into element with selector\: "</span>{selector}"`;
        } else {
            console.warn(`[EXECUTE] Element not found for type: "${selector}"`);
            return `Error: Element not found with selector: "${selector}" for type action.`;
        }
    } catch (error) {
        console.error(`[EXECUTE] Error typing text into "${selector}":`, error);
        return `Error typing "<span class="math-inline">\{text\}" into "</span>{selector}": ${error.message}`;
    }
}

async function readPageContent(selector = 'body') {
    try {
        const page = await getOrCreatePage();
        console.log(`[EXECUTE] Attempting to read content from selector: "${selector}"`);

        const element = await page.$(selector);
        if (element) {
            const textContent = await element.innerText();
            console.log(`[EXECUTE] Successfully read content from: "${selector}"`);
            return textContent.substring(0, 5000) + (textContent.length > 5000 ? '...' : '');
        } else {
            console.warn(`[EXECUTE] Element not found for reading: "${selector}"`);
            return `Error: Element not found with selector: "${selector}" for reading.`;
        }
    } catch (error) {
        console.error(`[EXECUTE] Error reading content from "${selector}":`, error);
        return `Error reading content from "${selector}": ${error.message}`;
    }
}


async function scrollPage(direction) {
    try {
        const page = await getOrCreatePage();
        console.log(`[EXECUTE] Attempting to scroll page: "${direction}"`);

        switch (direction.toLowerCase()) {
            case 'down':
                await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.8));
                break;
            case 'up':
                await page.evaluate(() => window.scrollBy(0, -window.innerHeight * 0.8));
                break;
            case 'bottom':
                await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                break;
            case 'top':
                await page.evaluate(() => window.scrollTo(0, 0));
                break;
            default:
                return `Error: Invalid scroll direction "${direction}". Use 'down', 'up', 'bottom', or 'top'.`;
        }
        console.log(`[EXECUTE] Successfully scrolled page: "${direction}"`);
        return `Scrolled page: "${direction}"`;
    } catch (error) {
        console.error(`[EXECUTE] Error scrolling page "${direction}":`, error);
        return `Error scrolling page "${direction}": ${error.message}`;
    }
}

module.exports = {
    clickElement,
    typeText,
    readPageContent,
    scrollPage
};