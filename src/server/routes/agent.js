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
// src/server/routes/agent.ts
require("dotenv/config");
const express_1 = require("express");
const logger_1 = require("../../shared/logger");
const AgentService_1 = require("../../agent/AgentService");
const BrowserManager_1 = require("../../browser/BrowserManager");
const Controller_1 = require("../../controller/Controller");
const openai_1 = require("@langchain/openai");
const logger = (0, logger_1.getLogger)('AgentRoutes');
const router = (0, express_1.Router)();
let activeAgent = null;
let currentAgentTaskId = null;
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
function ensureAgentInitialized(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!activeAgent) {
            logger.warn('Agent not initialized. Please start a new task first.');
            res.status(400).json({ success: false, message: 'Agent not initialized. Please start a new task.' });
            return;
        }
        next();
    });
}
router.post('/start', asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const { task, llmConfig, agentConfig } = req.body;
    if (!task) {
        logger.warn('Start agent request: Missing "task" in body.');
        res.status(400).json({ success: false, message: 'Missing task in request body.' });
        return;
    }
    if (activeAgent) {
        if (!activeAgent.state.stopped && !activeAgent.state.paused) {
            logger.warn(`Attempt to start new agent while one is already active (Task ID: ${activeAgent.id}).`);
            res.status(400).json({ success: false, message: `Agent with Task ID ${activeAgent.id} is already running or paused. Please stop it first.` });
            return;
        }
        else {
            logger.info('Existing agent found in stopped/paused state. Shutting it down before starting new one.');
            yield activeAgent.shutdown();
            activeAgent = null;
            currentAgentTaskId = null;
        }
    }
    try {
        let llm;
        let explicitToolCallingMethod;
        if ((llmConfig === null || llmConfig === void 0 ? void 0 : llmConfig.provider) === 'openai') {
            if (!process.env.OPENAI_API_KEY) {
                throw new Error("OPENAI_API_KEY environment variable is not set.");
            }
            llm = new openai_1.ChatOpenAI({
                openAIApiKey: process.env.OPENAI_API_KEY,
                modelName: llmConfig.model || 'gpt-4',
                temperature: (_a = llmConfig.temperature) !== null && _a !== void 0 ? _a : 0,
                streaming: true,
            });
            logger.info(`Initialized OpenAI LLM with model: ${llmConfig.model || 'gpt-4'}`);
        }
        else if ((llmConfig === null || llmConfig === void 0 ? void 0 : llmConfig.provider) === 'azure-openai') { // Changed provider name to 'azure-openai'
            // CORRECTED: Use AzureChatOpenAI with its specific parameters from environment variables
            if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_API_INSTANCE_NAME || !process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME || !process.env.AZURE_OPENAI_API_VERSION) {
                throw new Error("Azure OpenAI environment variables (AZURE_OPENAI_API_KEY, AZURE_OPENAI_API_INSTANCE_NAME, AZURE_OPENAI_API_DEPLOYMENT_NAME, AZURE_OPENAI_API_VERSION) are not set.");
            }
            llm = new openai_1.AzureChatOpenAI({
                azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
                azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME, // Your Azure resource name
                azureOpenAIApiDeploymentName: llmConfig.model || process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME, // Your deployment name (e.g., 'gpt-4-turbo-deployment')
                azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION, // e.g., "2023-05-15", "2024-02-15"
                temperature: (_b = llmConfig.temperature) !== null && _b !== void 0 ? _b : 0,
                streaming: true,
            });
            logger.info(`Initialized Azure OpenAI LLM with deployment: ${llmConfig.model || process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME}`);
        }
        else if ((llmConfig === null || llmConfig === void 0 ? void 0 : llmConfig.provider) === 'openrouter') {
            if (!process.env.OPENROUTER_API_KEY) {
                throw new Error("OPENROUTER_API_KEY environment variable is not set.");
            }
            llm = new openai_1.ChatOpenAI({
                openAIApiKey: process.env.OPENROUTER_API_KEY,
                modelName: llmConfig.model || "deepseek/deepseek-chat-v3-0324:free", // Your desired model
                temperature: (_c = llmConfig.temperature) !== null && _c !== void 0 ? _c : 0,
                streaming: true,
                configuration: {
                    baseURL: 'https://openrouter.ai/api/v1',
                },
            });
            logger.info(`Initialized OpenRouter LLM with model: ${llmConfig.model || 'deepseek/deepseek-chat-v3-0324:free'}`);
            // Forcing raw mode for OpenRouter/Deepseek due to prior issues
            explicitToolCallingMethod = 'raw';
        }
        else {
            logger.warn('No valid LLM provider specified in llmConfig. Using default OpenAI GPT-4.');
            llm = new openai_1.ChatOpenAI({
                openAIApiKey: process.env.OPENAI_API_KEY,
                modelName: 'gpt-4',
                temperature: 0,
            });
        }
        const browserManager = new BrowserManager_1.BrowserManager();
        const controller = new Controller_1.Controller(browserManager);
        activeAgent = new AgentService_1.AgentService(task, llm, Object.assign(Object.assign({ browserManager,
            controller }, agentConfig), { toolCallingMethod: explicitToolCallingMethod || (agentConfig === null || agentConfig === void 0 ? void 0 : agentConfig.toolCallingMethod) }));
        currentAgentTaskId = activeAgent.id;
        activeAgent.init((_d = agentConfig === null || agentConfig === void 0 ? void 0 : agentConfig.headless) !== null && _d !== void 0 ? _d : false).then(() => {
            var _a;
            logger.info(`Agent Task ID ${activeAgent === null || activeAgent === void 0 ? void 0 : activeAgent.id} browser initialized.`);
            activeAgent === null || activeAgent === void 0 ? void 0 : activeAgent.run((_a = agentConfig === null || agentConfig === void 0 ? void 0 : agentConfig.maxSteps) !== null && _a !== void 0 ? _a : 100).then((history) => {
                logger.info(`Agent Task ID ${activeAgent === null || activeAgent === void 0 ? void 0 : activeAgent.id} completed. Final success: ${history.is_successful()}`);
            }).catch((runError) => {
                logger.error(`Agent Task ID ${activeAgent === null || activeAgent === void 0 ? void 0 : activeAgent.id} run failed: ${runError.message}`, runError);
            });
        }).catch((initError) => {
            logger.error(`Agent Task ID ${activeAgent === null || activeAgent === void 0 ? void 0 : activeAgent.id} browser initialization failed: ${initError.message}`, initError);
            activeAgent = null;
            currentAgentTaskId = null;
        });
        res.status(200).json({
            success: true,
            taskId: activeAgent.id,
            sessionId: activeAgent.sessionId,
            message: 'Agent task started successfully. Check WebSocket for real-time updates.'
        });
        logger.info(`Agent task "${task}" started with ID: ${activeAgent.id}`);
    }
    catch (error) {
        logger.error(`Failed to start agent task: ${error.message}`, error);
        res.status(500).json({ success: false, message: `Failed to start agent task: ${error.message}` });
    }
})));
router.post('/stop', ensureAgentInitialized, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        activeAgent === null || activeAgent === void 0 ? void 0 : activeAgent.stop();
        res.status(200).json({ success: true, message: `Agent task ${currentAgentTaskId} signaled to stop.` });
        logger.info(`Agent task ${currentAgentTaskId} signaled to stop.`);
    }
    catch (error) {
        logger.error(`Failed to stop agent task ${currentAgentTaskId}: ${error.message}`, error);
        res.status(500).json({ success: false, message: `Failed to stop agent task: ${error.message}` });
    }
})));
router.post('/pause', ensureAgentInitialized, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (activeAgent === null || activeAgent === void 0 ? void 0 : activeAgent.state.paused) {
            res.status(400).json({ success: false, message: 'Agent is already paused.' });
            return;
        }
        activeAgent === null || activeAgent === void 0 ? void 0 : activeAgent.pause();
        res.status(200).json({ success: true, message: `Agent task ${currentAgentTaskId} signaled to pause.` });
        logger.info(`Agent task ${currentAgentTaskId} signaled to pause.`);
    }
    catch (error) {
        logger.error(`Failed to pause agent task ${currentAgentTaskId}: ${error.message}`, error);
        res.status(500).json({ success: false, message: `Failed to pause agent task: ${error.message}` });
    }
})));
router.post('/resume', ensureAgentInitialized, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!(activeAgent === null || activeAgent === void 0 ? void 0 : activeAgent.state.paused)) {
            res.status(400).json({ success: false, message: 'Agent is not paused.' });
            return;
        }
        activeAgent === null || activeAgent === void 0 ? void 0 : activeAgent.resume();
        res.status(200).json({ success: true, message: `Agent task ${currentAgentTaskId} signaled to resume.` });
        logger.info(`Agent task ${currentAgentTaskId} signaled to resume.`);
    }
    catch (error) {
        logger.error(`Failed to resume agent task ${currentAgentTaskId}: ${error.message}`, error);
        res.status(500).json({ success: false, message: `Failed to resume agent task: ${error.message}` });
    }
})));
router.get('/status', (req, res) => {
    if (!activeAgent) {
        res.status(200).json({ success: true, status: 'inactive', taskId: null, sessionId: null });
        return;
    }
    let status = 'running';
    if (activeAgent.state.stopped) {
        status = 'stopped';
    }
    else if (activeAgent.state.paused) {
        status = 'paused';
    }
    res.status(200).json({
        success: true,
        status,
        taskId: activeAgent.id,
        sessionId: activeAgent.sessionId,
        currentStep: activeAgent.state.n_steps,
        maxFailures: activeAgent.settings.maxFailures,
        consecutiveFailures: activeAgent.state.consecutive_failures,
        task: activeAgent.task,
    });
    return;
});
router.get('/history', ensureAgentInitialized, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const history = activeAgent.state.history.history;
        res.status(200).json({ success: true, history });
        logger.debug(`Retrieved history for agent task ${currentAgentTaskId}.`);
    }
    catch (error) {
        logger.error(`Failed to retrieve history for agent task ${currentAgentTaskId}: ${error.message}`, error);
        res.status(500).json({ success: false, message: `Failed to retrieve history: ${error.message}` });
    }
})));
exports.default = router;
