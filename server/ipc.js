const axios = require('axios'); 
const { PYTHON_VISION_URL, PYTHON_AGENT_URL } = require('../shared/config'); 

async function callVisionProcessor(screenshotPath) {
    console.log(`[IPC] Calling Python Vision Processor at ${PYTHON_VISION_URL}/process_image`);
    try {
        const response = await axios.post(`${PYTHON_VISION_URL}/process_image`, {
            screenshot_path: screenshotPath 
        });


        const data = response.data;

        if (data.status === 'success' && Array.isArray(data.extracted_elements)) {
            console.log(`[IPC] Vision Processor returned ${data.extracted_elements.length} OCR elements.`);
            return data.extracted_elements;
        } else {
            throw new Error(`Vision service returned unexpected data format: ${JSON.stringify(data)}`);
        }

    } catch (error) {
        console.error('[IPC] Error calling Vision Processor Service:');

        if (error.response) {
            console.error(`  Status: ${error.response.status}`);
            console.error(`  Data: ${JSON.stringify(error.response.data)}`);
            console.error(`  Headers: ${JSON.stringify(error.response.headers)}`);
        } else if (error.request) {
            console.error('  No response received:', error.request);
        } else {
            console.error('  Error message:', error.message);
        }
        throw error; 
    }
}


async function callAgentService(prompt, pageElements) {
    console.log(`[IPC] Calling Python Agent Service at ${PYTHON_AGENT_URL}/process_prompt`);
    try {
        const response = await axios.post(`${PYTHON_AGENT_URL}/process_prompt`, {
            prompt: prompt,
            page_elements: pageElements 
        });

        const data = response.data;
        if (data.status === 'success' && data.agent_response) {
            console.log(`[IPC] Agent Service responded.`);
            return data.agent_response;
        } else {
            throw new Error(`Agent service returned unexpected data format: ${JSON.stringify(data)}`);
        }

    } catch (error) {
        console.error('[IPC] Error calling Agent Service:');
        if (error.response) {
            console.error(`  Status: ${error.response.status}`);
            console.error(`  Data: ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
            console.error('  No response received:', error.request);
        } else {
            console.error('  Error message:', error.message);
        }
        throw error; 
    }
}


module.exports = {
    callVisionProcessor,
    callAgentService
};