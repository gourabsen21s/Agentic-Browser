const express = require('express');
const {NODE_SERVER_PORT} = require("../shared/config.js");
const { navigate, takeScreenshotAndExtractDom, closeBrowser, launchBrowser } = require('../automation/browser');
const { callVisionProcessor } = require('./ipc.js');
const { mergeDomAndOcr } = require('../matcher/merge');


const app = express();

app.use(express.json());

app.get('/',(req,res)=>{
    res.status(200).json({message:"Server is running successfully"});
})
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
            message: `Maped to ${url} and captured data.`,
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
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required.' });
    }

    console.log(`[SERVER] Received request to navigate to: ${url}`);
    try {
        await launchBrowser('chromium', true);
        await navigate(url);
        const pageData = await takeScreenshotAndExtractDom(); // This returns screenshotPath, htmlContent, domElementsWithBbox

        console.log('[SERVER] Navigation and capture complete. Now calling Vision Processor...');
        
        const ocrElements = await callVisionProcessor(pageData.screenshotPath);

        console.log('[SERVER] Vision Processing complete. Responding with all collected data.');

        const mergedActionableElements = mergeDomAndOcr(pageData.domElementsWithBbox, ocrElements);
        console.log('[SERVER] Merging complete. Responding with all collected data.');
        res.json({
            status: 'success',
            message: `Mapsd to ${url}, captured data, and processed with OCR.`,
            data: {
                url: url,
                screenshotPath: pageData.screenshotPath,
                htmlContentPreview: pageData.htmlContent.substring(0, 500) + '...',
                domElementsFromBrowser: pageData.domElementsWithBbox,
                ocrElements: ocrElements,
                mergedActionableElements: mergedActionableElements 
            }
        });

    } catch (error) {
        console.error('[SERVER] Error during navigation and processing:', error);
        res.status(500).json({ status: 'error', message: error.message });
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

app.listen(NODE_SERVER_PORT, ()=>{
    console.log(`[SERVER] Node.js Centralized Server listening on port ${NODE_SERVER_PORT}`);
    console.log(`[SERVER] Access server health check at http://localhost:${NODE_SERVER_PORT}/`);
    console.log(`[SERVER] Test navigation: POST http://localhost:${NODE_SERVER_PORT}/api/navigate-and-capture`);
})