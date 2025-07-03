// src/server/routes/agent.ts
import 'dotenv/config'; 
import { Router, Request, Response, NextFunction } from 'express';
import { getLogger } from '../../shared/logger';
import { AgentService } from '../../agent/AgentService';
import { BrowserManager } from '../../browser/BrowserManager';
import { Controller } from '../../controller/Controller';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI, AzureChatOpenAI } from '@langchain/openai';
import { AgentHistoryList, ToolCallingMethod } from '../../shared/types'; // Import ToolCallingMethod

const logger = getLogger('AgentRoutes');
const router = Router();

let activeAgent: AgentService | null = null;
let currentAgentTaskId: string | null = null;

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

async function ensureAgentInitialized(req: Request, res: Response, next: NextFunction) {
  if (!activeAgent) {
    logger.warn('Agent not initialized. Please start a new task first.');
    res.status(400).json({ success: false, message: 'Agent not initialized. Please start a new task.' });
    return;
  }
  next();
}

router.post('/start', asyncHandler(async (req: Request, res: Response) => {
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
    } else {
      logger.info('Existing agent found in stopped/paused state. Shutting it down before starting new one.');
      await activeAgent.shutdown();
      activeAgent = null;
      currentAgentTaskId = null;
    }
  }

  try {
    let llm: BaseChatModel;
    let explicitToolCallingMethod: ToolCallingMethod | undefined;

    if (llmConfig?.provider === 'openai') {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY environment variable is not set.");
      }
      llm = new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: llmConfig.model || 'gpt-4',
        temperature: llmConfig.temperature ?? 0,
        streaming: true,
      });
      logger.info(`Initialized OpenAI LLM with model: ${llmConfig.model || 'gpt-4'}`);
    } else if (llmConfig?.provider === 'azure-openai') { // Changed provider name to 'azure-openai'
      // CORRECTED: Use AzureChatOpenAI with its specific parameters from environment variables
      if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_API_INSTANCE_NAME || !process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME || !process.env.AZURE_OPENAI_API_VERSION) {
        throw new Error("Azure OpenAI environment variables (AZURE_OPENAI_API_KEY, AZURE_OPENAI_API_INSTANCE_NAME, AZURE_OPENAI_API_DEPLOYMENT_NAME, AZURE_OPENAI_API_VERSION) are not set.");
      }
      llm = new AzureChatOpenAI({
        azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
        azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME, // Your Azure resource name
        azureOpenAIApiDeploymentName: llmConfig.model || process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME, // Your deployment name (e.g., 'gpt-4-turbo-deployment')
        azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION, // e.g., "2023-05-15", "2024-02-15"
        temperature: llmConfig.temperature ?? 0,
        streaming: true,
      });
      logger.info(`Initialized Azure OpenAI LLM with deployment: ${llmConfig.model || process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME}`);
    } else if (llmConfig?.provider === 'openrouter') {
      if (!process.env.OPENROUTER_API_KEY) {
          throw new Error("OPENROUTER_API_KEY environment variable is not set.");
      }
      llm = new ChatOpenAI({
        openAIApiKey: process.env.OPENROUTER_API_KEY, 
        modelName: llmConfig.model || "deepseek/deepseek-chat-v3-0324:free", // Your desired model
        temperature: llmConfig.temperature ?? 0,
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
      llm = new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: 'gpt-4',
        temperature: 0,
      });
    }

    const browserManager = new BrowserManager();
    const controller = new Controller(browserManager);

    activeAgent = new AgentService(task, llm, {
      browserManager,
      controller,
      ...agentConfig,
      toolCallingMethod: explicitToolCallingMethod || agentConfig?.toolCallingMethod,
    });

    currentAgentTaskId = activeAgent.id;

    activeAgent.init(agentConfig?.headless ?? false).then(() => {
      logger.info(`Agent Task ID ${activeAgent?.id} browser initialized.`);
      activeAgent?.run(agentConfig?.maxSteps ?? 100).then((history: AgentHistoryList) => {
        logger.info(`Agent Task ID ${activeAgent?.id} completed. Final success: ${history.is_successful()}`);
      }).catch((runError: Error) => {
        logger.error(`Agent Task ID ${activeAgent?.id} run failed: ${runError.message}`, runError);
      });
    }).catch((initError: Error) => {
      logger.error(`Agent Task ID ${activeAgent?.id} browser initialization failed: ${initError.message}`, initError);
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

  } catch (error: any) {
    logger.error(`Failed to start agent task: ${error.message}`, error);
    res.status(500).json({ success: false, message: `Failed to start agent task: ${error.message}` });
  }
}));

router.post('/stop', ensureAgentInitialized, asyncHandler(async (req: Request, res: Response) => {
  try {
    activeAgent?.stop();
    res.status(200).json({ success: true, message: `Agent task ${currentAgentTaskId} signaled to stop.` });
    logger.info(`Agent task ${currentAgentTaskId} signaled to stop.`);
  } catch (error: any) {
    logger.error(`Failed to stop agent task ${currentAgentTaskId}: ${error.message}`, error);
    res.status(500).json({ success: false, message: `Failed to stop agent task: ${error.message}` });
  }
}));

router.post('/pause', ensureAgentInitialized, asyncHandler(async (req: Request, res: Response) => {
  try {
    if (activeAgent?.state.paused) {
      res.status(400).json({ success: false, message: 'Agent is already paused.' });
      return;
    }
    activeAgent?.pause();
    res.status(200).json({ success: true, message: `Agent task ${currentAgentTaskId} signaled to pause.` });
    logger.info(`Agent task ${currentAgentTaskId} signaled to pause.`);
  } catch (error: any) {
    logger.error(`Failed to pause agent task ${currentAgentTaskId}: ${error.message}`, error);
    res.status(500).json({ success: false, message: `Failed to pause agent task: ${error.message}` });
  }
}));

router.post('/resume', ensureAgentInitialized, asyncHandler(async (req: Request, res: Response) => {
  try {
    if (!activeAgent?.state.paused) {
      res.status(400).json({ success: false, message: 'Agent is not paused.' });
      return;
    }
    activeAgent?.resume();
    res.status(200).json({ success: true, message: `Agent task ${currentAgentTaskId} signaled to resume.` });
    logger.info(`Agent task ${currentAgentTaskId} signaled to resume.`);
  } catch (error: any) {
    logger.error(`Failed to resume agent task ${currentAgentTaskId}: ${error.message}`, error);
    res.status(500).json({ success: false, message: `Failed to resume agent task: ${error.message}` });
  }
}));

router.get('/status', (req: Request, res: Response) => {
  if (!activeAgent) {
    res.status(200).json({ success: true, status: 'inactive', taskId: null, sessionId: null });
    return;
  }

  let status = 'running';
  if (activeAgent.state.stopped) {
    status = 'stopped';
  } else if (activeAgent.state.paused) {
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

router.get('/history', ensureAgentInitialized, asyncHandler(async (req: Request, res: Response) => {
  try {
    const history = activeAgent!.state.history.history;
    res.status(200).json({ success: true, history });
    logger.debug(`Retrieved history for agent task ${currentAgentTaskId}.`);
  } catch (error: any) {
    logger.error(`Failed to retrieve history for agent task ${currentAgentTaskId}: ${error.message}`, error);
    res.status(500).json({ success: false, message: `Failed to retrieve history: ${error.message}` });
  }
}));

export default router;