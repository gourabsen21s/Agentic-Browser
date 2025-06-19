const express = require('express');
const { NODE_SERVER_PORT } = require('../shared/config');
const { navigate, takeScreenshotAndExtractDom, closeBrowser, launchBrowser } = require('../automation/browser');
const { clickElement, typeText, readPageContent, scrollPage } = require('../automation/execute');
const { callVisionProcessor, callAgentService } = require('./ipc');

const { mergeDomAndOcr } = require('../matcher/merge');

const app = express();


app.use(express.json());


app.get('/', (req, res) => {
    res.status(200).json({ message: "Vision Agent System Server is running!" });
});


app.post('/api/navigate-and-capture', async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'URL is required.' });
    }
    console.log(`[SERVER] Received request to navigate to: ${url}`);
    try {
        await launchBrowser('chromium', false); 
        await navigate(url);
        const pageData = await takeScreenshotAndExtractDom();

        console.log('[SERVER] Navigation and capture complete. Responding with data.');
        res.json({
            status: 'success',
            message: `Mapsd to ${url} and captured data.`,
            data: {
                screenshotPath: pageData.screenshotPath,
                htmlContentPreview: pageData.htmlContent.substring(0, 500) + '...',
                domElementsCount: pageData.domElementsWithBbox.length,
                domElementsPreview: pageData.domElementsWithBbox.slice(0, 5)
            }
        });

    } catch (error) {
        console.error('[SERVER] Error during navigation and capture:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

app.post('/api/navigate-and-process', async (req, res) => {
    const { url, prompt } = req.body; 

    if (!url) {
        return res.status(400).json({ error: 'URL is required.' });
    }
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required for agent processing.' });
    }

    console.log(`[SERVER] Received prompt: "${prompt}" for URL: ${url}`);
    try {

        await launchBrowser('chromium', true); 
        await navigate(url); 

        console.log('[SERVER] Page navigated. Capturing screenshot and DOM...');
        const pageData = await takeScreenshotAndExtractDom(); 

        console.log('[SERVER] Capture complete. Calling Python Vision Processor...');
        const ocrElements = await callVisionProcessor(pageData.screenshotPath); 

        console.log('[SERVER] Vision Processing complete. Merging DOM and OCR data...');
        const mergedActionableElements = mergeDomAndOcr(pageData.domElementsWithBbox, ocrElements); 

        console.log('[SERVER] Merging complete. Sending data and prompt to Agent Service...');
        const agentResponse = await callAgentService(prompt, mergedActionableElements); 

        console.log('[SERVER] Agent Service response received. Responding to client.');
        res.json({
            status: 'success',
            message: `Agent processed prompt for ${url}.`,
            data: {
                initialUrl: url,
                finalScreenshotPath: pageData.screenshotPath, 
                domElementsAtStart: pageData.domElementsWithBbox,
                ocrElementsAtStart: ocrElements,
                mergedElementsAtStart: mergedActionableElements,
                agentOutput: agentResponse 
            }
        });

    } catch (error) {
        console.error('[SERVER] Error during full pipeline execution:', error);
        res.status(500).json({ status: 'error', message: `Full pipeline failed: ${error.message}` });
    }
});

app.post('/api/browser/navigate', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ status: 'error', message: 'URL is required.' });
    try {
        await launchBrowser('chromium', true); 
        await navigate(url); 
        res.json({ status: 'success', message: `Browser navigated to ${url}.` });
    } catch (error) {
        console.error(`[SERVER] Error navigating to ${url}:`, error);
        res.status(500).json({ status: 'error', message: `Failed to navigate: ${error.message}` });
    }
});


app.post('/api/browser/click', async (req, res) => {
    const { selector } = req.body;
    if (!selector) return res.status(400).json({ status: 'error', message: 'Selector is required.' });
    try {
        const message = await clickElement(selector); 
        res.json({ status: 'success', message: message });
    } catch (error) {
        console.error(`[SERVER] Error processing click for ${selector}:`, error);
        res.status(500).json({ status: 'error', message: `Failed to click: ${error.message}` });
    }
});

app.post('/api/browser/type', async (req, res) => {
    const { selector, text } = req.body;
    if (!selector || text === undefined) return res.status(400).json({ status: 'error', message: 'Selector and text are required.' });
    try {
        const message = await typeText(selector, text); 
        res.json({ status: 'success', message: message });
    } catch (error) {
        console.error(`[SERVER] Error processing type for ${selector}:`, error);
        res.status(500).json({ status: 'error', message: `Failed to type: ${error.message}` });
    }
});

app.post('/api/browser/read_page', async (req, res) => {
    const { selector } = req.body; 
    try {
        const content = await readPageContent(selector); 
        res.json({ status: 'success', content: content });
    } catch (error) {
        console.error(`[SERVER] Error processing read for ${selector}:`, error);
        res.status(500).json({ status: 'error', message: `Failed to read: ${error.message}` });
    }
});


app.post('/api/browser/scroll', async (req, res) => {
    const { direction } = req.body;
    if (!direction) return res.status(400).json({ status: 'error', message: 'Direction is required.' });
    try {
        const message = await scrollPage(direction); 
        res.json({ status: 'success', message: message });
    } catch (error) {
        console.error(`[SERVER] Error processing scroll for ${direction}:`, error);
        res.status(500).json({ status: 'error', message: `Failed to scroll: ${error.message}` });
    }
});

app.post('/api/close-browser', async (req, res) => {
    try {
        await closeBrowser();
        res.json({ status: 'success', message: 'Browser closed.' });
    } catch (error) {
        console.error('[SERVER] Error closing browser:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});


const startServer = () => {
    app.listen(NODE_SERVER_PORT, () => {
        console.log(`[SERVER] Node.js Centralized Server listening on port ${NODE_SERVER_PORT}`);
        console.log(`[SERVER] Access health check at http://localhost:${NODE_SERVER_PORT}/`);
        console.log(`[SERVER] Initiate full pipeline: POST http://localhost:${NODE_SERVER_PORT}/api/navigate-and-process`);
        console.log(`[SERVER] Browser action API base: http://localhost:${NODE_SERVER_PORT}/api/browser/`);
    });
};


if (require.main === module) {
    startServer();
}