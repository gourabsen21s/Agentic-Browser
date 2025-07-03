// src/agent/AgentService.ts
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage, BaseMessage } from '@langchain/core/messages';
import { v4 as uuidv4 } from 'uuid'; // For UUID generation
import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events'; // Node.js built-in EventEmitter for event bus
// Import services and utilities
import { BrowserManager } from '../browser/BrowserManager';
import { Controller } from '../controller/Controller';
import { LLMService } from '../llm/LLMService';
import { MessageManager } from './MessageManagerService';
import { Memory } from './MemoryService';
import { HistoryTreeProcessor } from '../dom/HistoryTreeProcessorService';
// Import all shared types
import {
  AgentSettings,
  AgentState,
  ActionResult,
  AgentHistoryList,
  BrowserStateSummary,
  StepMetadata,
  ToolCallingMethod,
  ActionModel,
  AgentOutput,
  MemoryConfig,
  BrowserProfile,
  DOMHistoryElement,
  AgentTelemetryEvent,
  CreateAgentOutputFileEvent,
  CreateAgentSessionEvent,
  CreateAgentStepEvent,
  CreateAgentTaskEvent,
  UpdateAgentTaskEvent,
  BrowserStateHistory,
  AgentHistory,
  AppLogger,
  AgentHookFunc,
} from '../shared/types';
// Import shared utilities
import {
  getBrowserUseVersion,
  timeExecutionAsync, // Keep import if used elsewhere, but not on AgentService methods now
  timeExecutionSync, // Keep import if used elsewhere, but not on AgentService methods now
  _logPrettyPath,
  saveConversation,
  extractJsonFromModelOutput,
  isModelWithoutToolSupport,
  convertInputMessages,
} from '../shared/utils';
// Import shared telemetry and cloud services
import { ProductTelemetry } from '../shared/telemetryService';
import { CloudSync } from '../shared/cloudSyncService';
// Import ActionRegistry (from the same agent directory)
import { ActionRegistry } from './ActionRegistry';
// Import getLogger utility from shared
import { getLogger } from '../shared/logger';
// Define a custom error type for agent interruptions (e.g., pause, stop)
class AgentInterruptedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentInterruptedError';
    Object.setPrototypeOf(this, AgentInterruptedError.prototype);
  }
}
/**
 * The core Agent class responsible for orchestrating browser automation tasks.
 * It integrates various services (LLM, Browser, Controller, Memory, Messaging, Telemetry)
 * to perform tasks, manage state, and handle execution flow.
 */
export class AgentService {
  // Core Components (Initialized in constructor)
  private llmService: LLMService;
  private controller: Controller;
  private browserManager: BrowserManager;
  private messageManager: MessageManager;
  private memory: Memory | null; // Can be null if memory is disabled
  // Agent State & Settings (Initialized in constructor)
  public task: string;
  public settings: AgentSettings;
  public state: AgentState;
  public id: string;
  public sessionId: string;
  // Versioning & Source (Initialized in constructor)
  public version!: string; // Corrected: Using '!' for definite assignment
  public source!: string;  // Corrected: Using '!' for definite assignment
  // Determined tool calling method (Initialized in constructor/async init)
  public toolCallingMethod!: ToolCallingMethod | null; // Corrected: Using '!' for definite assignment
  // Dynamic Action Model References (Populated in _setupActionModels)
  private ActionModelClass!: typeof ActionModel; // Corrected: Using '!' for definite assignment
  private AgentOutputClass!: typeof AgentOutput; // Corrected: Using '!' for definite assignment
  private DoneActionModelClass!: typeof ActionModel; // Corrected: Using '!' for definite assignment
  private DoneAgentOutputClass!: typeof AgentOutput; // Corrected: Using '!' for definite assignment
  // Callbacks for external systems (Optional)
  private registerNewStepCallback?: (browserStateSummary: BrowserStateSummary, agentOutput: AgentOutput, stepNumber: number) => Promise<void> | void;
  private registerDoneCallback?: (history: AgentHistoryList) => Promise<void> | void;
  private registerExternalAgentStatusRaiseErrorCallback?: () => Promise<boolean>;
  // Context (for custom data accessible by actions/hooks)
  private context?: any;
  // Telemetry & Cloud Sync (Initialized in constructor)
  private telemetry: ProductTelemetry;
  private eventBus: EventEmitter;
  private cloudSync: CloudSync | null;
  // Internal Control Flow (for pause/resume/stop)
  private _externalPauseEvent: EventEmitter;
  private _forceExitTelemetryLogged: boolean = false;
  // Initial Actions (optional actions to run at the very beginning)
  private initialActions: ActionModel[] | null;
  // Class property for sensitiveData (initialized in constructor)
  private sensitiveData: Record<string, string | Record<string, string>> | null;
  // Internal logger instance, dynamically named (initialized in constructor)
  private _logger: AppLogger;
  // Getter for public access to the logger (reflects current page context)
  public get logger(): AppLogger {
    const currentPage = this.browserManager.getCurrentPageSync();
    const _pageUrl = currentPage ? currentPage.url() : 'N/A';
    const _pageId = _pageUrl.length > 20 ? _pageUrl.substring(0, 20) + '...' : _pageUrl;
    return getLogger(`Agent[${this.id.substring(0, 4)}] Session[${this.sessionId.substring(0,4)}] Page[${_pageId}]`);
  }
  /**
   * Constructs a new AgentService instance.
   * @param task The overall task description for the agent.
   * @param llm The LangChain BaseChatModel instance to use as the primary LLM.
   * @param options Optional configuration parameters for the agent.
   */
  // Removed @timeExecutionSync decorator from constructor as it's not valid there
  constructor(
    task: string,
    llm: BaseChatModel,
    options?: {
      browserManager?: BrowserManager;
      controller?: Controller;
      sensitiveData?: Record<string, string | Record<string, string>>;
      initialActions?: Record<string, Record<string, any>>[];
      registerNewStepCallback?: (browserStateSummary: BrowserStateSummary, agentOutput: AgentOutput, stepNumber: number) => Promise<void> | void;
      registerDoneCallback?: (history: AgentHistoryList) => Promise<void> | void;
      registerExternalAgentStatusRaiseErrorCallback?: () => Promise<boolean>;
      useVision?: boolean;
      useVisionForPlanner?: boolean;
      saveConversationPath?: string;
      saveConversationPathEncoding?: string;
      maxFailures?: number;
      retryDelay?: number;
      overrideSystemMessage?: string;
      extendSystemMessage?: string;
      maxInputTokens?: number;
      validateOutput?: boolean;
      messageContext?: string;
      generateGif?: boolean | string;
      availableFilePaths?: string[];
      includeAttributes?: string[];
      maxActionsPerStep?: number;
      toolCallingMethod?: ToolCallingMethod;
      pageExtractionLlm?: BaseChatModel;
      plannerLlm?: BaseChatModel;
      plannerInterval?: number;
      isPlannerReasoning?: boolean;
      extendPlannerSystemMessage?: string;
      injectedAgentState?: AgentState;
      context?: any;
      enableMemory?: boolean;
      memoryConfig?: MemoryConfig;
      source?: string;
      taskId?: string;
    }
  ) {
    options = options || {};
    this.id = options.taskId || uuidv4();
    this.sessionId = uuidv4();
    this.task = task;
    // Initialize logger property here in the constructor
    this._logger = getLogger(`AgentService[${this.id.substring(0, 4)}]`);
    // Initialize core services
    this.llmService = new LLMService(llm);
    this.browserManager = options.browserManager || new BrowserManager();
    this.controller = options.controller || new Controller(this.browserManager);
    this.sensitiveData = options.sensitiveData || null;
    // Initialize settings from options or defaults
    this.settings = {
      useVision: options.useVision ?? true,
      useVisionForPlanner: options.useVisionForPlanner ?? false,
      saveConversationPath: options.saveConversationPath ?? null,
      saveConversationPathEncoding: options.saveConversationPathEncoding ?? 'utf-8',
      maxFailures: options.maxFailures ?? 3,
      retryDelay: options.retryDelay ?? 10,
      overrideSystemMessage: options.overrideSystemMessage ?? null,
      extendSystemMessage: options.extendSystemMessage ?? null,
      maxInputTokens: options.maxInputTokens ?? 128000,
      validateOutput: options.validateOutput ?? false,
      messageContext: options.messageContext ?? null,
      generateGif: options.generateGif ?? false,
      availableFilePaths: options.availableFilePaths ?? null,
      includeAttributes: options.includeAttributes ?? [
        'title', 'type', 'name', 'role', 'aria-label', 'placeholder', 'value', 'alt',
        'aria-expanded', 'data-date-format', 'checked', 'data-state', 'aria-checked',
      ],
      maxActionsPerStep: options.maxActionsPerStep ?? 10,
      toolCallingMethod: options.toolCallingMethod ?? 'auto',
      pageExtractionLlm: options.pageExtractionLlm ?? llm,
      plannerLlm: options.plannerLlm ?? null,
      plannerInterval: options.plannerInterval ?? 1,
      isPlannerReasoning: options.isPlannerReasoning ?? false,
      extendPlannerSystemMessage: options.extendPlannerSystemMessage ?? null,
    };
    // Initialize agent state (can be injected for resuming runs)
    this.state = options.injectedAgentState || {
      n_steps: 0,
      consecutive_failures: 0,
      stopped: false,
      paused: false,
      last_result: null,
      history: new AgentHistoryList(), // AgentHistoryList is a class
      message_manager_state: { history: { messages: [], current_tokens: 0 } },
    };
    // Initialize version and source (definitely assigned here)
    this.version = getBrowserUseVersion();
    this.source = options.source || (fs.existsSync(path.resolve(__dirname, '../../.git')) ? 'git' : 'npm');
    // Setup action models (will retrieve constructors from registry)
    this._setupActionModels();
    // Verify LLM connection and setup tool calling method
    this._verifyAndSetupLlm().catch(e => {
        this.logger.error(`Initial LLM verification failed in constructor: ${e.message}`);
    });
    // Check for LLM vision compatibility warnings
    if (this.llmService.modelName.toLowerCase().includes('deepseek') || this.llmService.modelName.toLowerCase().includes('grok')) {
      this.logger.warn('⚠️ DeepSeek/Grok models do not support useVision=True yet. Setting useVision=False for now...');
      this.settings.useVision = false;
      this.settings.useVisionForPlanner = false;
    }
    // Set message context based on tool calling method and unfiltered actions
    const unfilteredActionsPrompt = this.controller.getPromptDescription();
    this.settings.messageContext = this._setMessageContext(unfilteredActionsPrompt);
    // Initialize MessageManager
    this.messageManager = new MessageManager(
      this.task,
      this.createSystemPrompt(unfilteredActionsPrompt), // Create initial system message
      { // Settings for MessageManager
        max_input_tokens: this.settings.maxInputTokens,
        include_attributes: this.settings.includeAttributes,
        message_context: this.settings.messageContext,
        sensitive_data: this.sensitiveData,
        available_file_paths: this.settings.availableFilePaths,
      },
      this.state.message_manager_state // Pass current message manager state
    );
    // Initialize Memory service if enabled
    if (options.enableMemory) {
      try {
        this.memory = new Memory(this.messageManager, this.llmService.llm, options.memoryConfig);
      } catch (e: any) {
        this.logger.warn(`⚠️ Agent(enableMemory=True) is set but failed to initialize MemoryService: ${e.message}. Memory features disabled.`);
        this.memory = null; // Disable memory if initialization fails
      }
    } else {
      this.memory = null;
    }
    // Convert raw initial actions data to ActionModel instances
    if (options.initialActions) {
      this.initialActions = this._convertInitialActions(options.initialActions);
    } else {
      this.initialActions = null;
    }
    // Sensitive data security warning (if allowed_domains are not restrictive)
    if (this.sensitiveData) {
      const hasDomainSpecificCredentials = Object.values(this.sensitiveData).some(v => typeof v === 'object' && v !== null);
      const allowedDomains = this.browserManager.browserProfile.allowed_domains || [];
      if (!allowedDomains.length) {
        this.logger.error(
          '⚠️⚠️⚠️ Agent(sensitiveData=••••••••) was provided but BrowserManager.browserProfile.allowed_domains is not locked down! ⚠️⚠️⚠️\n' +
          '          ☠️ If the agent visits a malicious website and encounters a prompt-injection attack, your sensitiveData may be exposed!\n\n' +
          '          Learn more: https://docs.browser-use.com/customize/browser-settings#restrict-urls\n' +
          'Waiting 10 seconds before continuing... Press [Ctrl+C] to abort.'
        );
        this.logger.warn('‼️ Continuing with insecure settings for now... but this will become a hard error in the future!');
      } else if (hasDomainSpecificCredentials) {
        const domainPatterns = Object.keys(this.sensitiveData).filter(k => typeof this.sensitiveData![k] === 'object');
        for (const domainPattern of domainPatterns) {
          const isAllowed = allowedDomains.some(allowedDomain => {
            const patternDomain = domainPattern.split('://').pop() || domainPattern;
            const allowedDomainPart = allowedDomain.split('://').pop() || allowedDomain;
            return patternDomain === allowedDomainPart ||
                   (allowedDomainPart.startsWith('*.') && (patternDomain === allowedDomainPart.substring(2) || patternDomain.endsWith(`.${allowedDomainPart.substring(2)}`)));
          });
          if (!isAllowed) {
            this.logger.warn(
              `⚠️ Domain pattern "${domainPattern}" in sensitiveData is not covered by any pattern in BrowserManager.browserProfile.allowed_domains=${allowedDomains}\n` +
              '   This may be a security risk as credentials could be used on unintended domains.'
            );
          }
        }
      }
    }
    // Register external callbacks
    this.registerNewStepCallback = options.registerNewStepCallback;
    this.registerDoneCallback = options.registerDoneCallback;
    this.registerExternalAgentStatusRaiseErrorCallback = options.registerExternalAgentStatusRaiseErrorCallback;
    // Store custom context
    this.context = options.context;
    // Initialize Telemetry and Event Bus
    this.telemetry = new ProductTelemetry();
    this.eventBus = new EventEmitter();
    // Enable Cloud Sync if configured
    const enableCloudSync = process.env.BROWSERUSE_CLOUD_SYNC?.toLowerCase()[0] === 't' || false;
    if (enableCloudSync) {
      this.cloudSync = new CloudSync();
      this.eventBus.on('*', (eventName: string, data: any) => this.cloudSync!.handleEvent(eventName, data));
    } else {
      this.cloudSync = null;
    }
    // Set up conversation saving path
    if (this.settings.saveConversationPath) {
      this.settings.saveConversationPath = path.resolve(this.settings.saveConversationPath);
      this.logger.info(`💬 Saving conversation to ${_logPrettyPath(this.settings.saveConversationPath)}`);
    }
    // Event emitter for internal pause/resume logic
    this._externalPauseEvent = new EventEmitter();
    this._externalPauseEvent.setMaxListeners(0);
    this._externalPauseEvent.emit('resume');
  }
  /**
   * Creates the initial system message for the LLM based on task, actions, and overrides.
   * @param unfilteredActionsPrompt A string description of all available actions.
   * @returns A `SystemMessage` object.
   */
  private createSystemPrompt(unfilteredActionsPrompt: string): SystemMessage {
    let systemMessageContent = `You are a browser automation agent. Your goal is to complete the given task using the available actions.
Available actions: ${unfilteredActionsPrompt}
Max actions per step: ${this.settings.maxActionsPerStep}
`;
    if (this.settings.overrideSystemMessage) {
      systemMessageContent = this.settings.overrideSystemMessage;
    } else if (this.settings.extendSystemMessage) {
      systemMessageContent += `\n${this.settings.extendSystemMessage}`;
    }
    return new SystemMessage({ content: systemMessageContent });
  }
  /**
   * Sets the message context string, especially important for 'raw' tool calling
   * where actions are directly included in the prompt.
   * @param unfilteredActionsPrompt A string description of all available actions.
   * @returns The final message context string.
   */
  private _setMessageContext(unfilteredActionsPrompt: string): string | null {
    if (this.toolCallingMethod === 'raw') {
      let messageContext = this.settings.messageContext || '';
      if (messageContext) {
        messageContext += `\n\nAvailable actions: ${unfilteredActionsPrompt}`;
      } else {
        messageContext = `Available actions: ${unfilteredActionsPrompt}`;
      }
      return messageContext;
    }
    return this.settings.messageContext;
  }
  /**
   * Sets the version and source of the browser-use library, used for telemetry.
   * @param sourceOverride Optional override for the source (e.g., 'cli', 'api').
   */
  private _setBrowserUseVersionAndSource(sourceOverride?: string): void {
    this.version = getBrowserUseVersion();
    this.source = sourceOverride || (fs.existsSync(path.resolve(__dirname, '../../.git')) ? 'git' : 'npm');
  }
  /**
   * Sets up the ActionModel and AgentOutput class references by retrieving
   * their constructors from the Controller's ActionRegistry.
   */
  private _setupActionModels(): void {
    this.ActionModelClass = this.controller.createActionModel();
    this.AgentOutputClass = AgentOutput.typeWithCustomActions(this.ActionModelClass);
    this.DoneActionModelClass = this.controller.createActionModel({ includeActions: ['done'] });
    this.DoneAgentOutputClass = AgentOutput.typeWithCustomActions(this.DoneActionModelClass);
  }
  /**
   * Verifies the LLM connection and determines the best tool calling method
   * using the `LLMService`.
   */
  private async _verifyAndSetupLlm(): Promise<void> {
    try {
      this.toolCallingMethod = await this.llmService.setToolCallingMethod(this.settings.toolCallingMethod);
    } catch (error: any) {
      this.logger.error(`Failed to verify and setup LLM: ${error.message}`, error);
      throw new Error(`LLM setup failed: ${error.message}`);
    }
  }
  /**
   * Converts raw dictionary-based action data (e.g., from initialActions)
   * into `ActionModel` instances.
   * @param actions A list of raw action objects.
   * @returns An array of `ActionModel` instances.
   */
  private _convertInitialActions(actions: Record<string, Record<string, any>>[]): ActionModel[] {
    const convertedActions: ActionModel[] = [];
    for (const actionDict of actions) {
      convertedActions.push(new this.ActionModelClass(actionDict));
    }
    return convertedActions;
  }
  /**
   * Adds a new task to the agent. This is typically used for continuous
   * tasks or for adding follow-up instructions without restarting the agent.
   * @param newTask The new task description.
   */
  add_new_task(newTask: string): void {
    this.task = newTask;
    this.messageManager.addNewTask(newTask);
  }
  /**
   * Utility function that raises an `AgentInterruptedError` if the agent is
   * stopped or paused externally.
   * @throws An `AgentInterruptedError` if the agent is paused or stopped.
   */
  private async _raiseIfStoppedOrPaused(): Promise<void> {
    if (this.registerExternalAgentStatusRaiseErrorCallback) {
      if (await this.registerExternalAgentStatusRaiseErrorCallback()) {
        throw new AgentInterruptedError('External agent status indicates an error.');
      }
    }
    if (this.state.stopped || this.state.paused) {
      throw new AgentInterruptedError('Agent paused or stopped.');
    }
  }
  /**
   * Public method to initialize and launch the agent's browser.
   * This should be called after the AgentService constructor.
   * @param headless Whether to launch the browser in headless mode.
   * @returns A Promise that resolves when the browser is launched.
   */
  public async init(headless: boolean = false): Promise<void> {
    // This method is called from agent.ts route to separate init from constructor.
    await this.browserManager.launch(headless);
    // Any other post-constructor async setup can go here.
    this.logger.info('Agent browser initialized.');
  }
  /**
   * Public method to shut down the agent's browser and clean up resources.
   * @returns A Promise that resolves when resources are closed.
   */
  public async shutdown(): Promise<void> {
    // This method is called from agent.ts route to cleanly shut down.
    await this.close(); // Delegate to internal close method
    this.logger.info('Agent browser shut down.');
  }
  /**
   * Public method to start the agent's main run loop.
   * @param maxSteps Maximum number of steps for the agent to execute.
   * @param onStepStart Optional callback to execute before each step.
   * @param onStepEnd Optional callback to execute after each step.
   * @returns A Promise that resolves with the complete `AgentHistoryList`.
   */
  public async run(
    maxSteps: number = 100,
    onStepStart: AgentHookFunc | null = null,
    onStepEnd: AgentHookFunc | null = null
  ): Promise<AgentHistoryList> {
    const startTime = Date.now(); // Manual timing start for run method
    let agentRunError: string | null = null;
    this._forceExitTelemetryLogged = false;
    // Set up signal handlers for graceful pause/resume/exit
    const onForceExitLogTelemetry = () => {
      this._logAgentEvent(maxSteps, 'SIGINT: Cancelled by user');
      this.telemetry.flush(); // Flush any pending telemetry events
      this._forceExitTelemetryLogged = true;
      process.exit(1); // Force exit the process on second Ctrl+C
    };
    const handleSIGINT = () => {
      if (this.state.paused) {
        onForceExitLogTelemetry(); // Second Ctrl+C while paused
      } else {
        this.pause(); // First Ctrl+C pauses
      }
    };
    process.on('SIGINT', handleSIGINT); // Register SIGINT handler
    try {
      this._logAgentRun(); // Log initial agent run details
      // Emit cloud events for session and task creation
      this.eventBus.emit('CreateAgentSessionEvent', CreateAgentSessionEvent.fromAgent(this));
      this.eventBus.emit('CreateAgentTaskEvent', CreateAgentTaskEvent.fromAgent(this));
      // Execute initial actions if provided
      if (this.initialActions && this.initialActions.length > 0) {
        const result = await this.multiAct(this.initialActions); // Corrected: Call with 'this.'
        this.state.last_result = result;
      }
      let taskCompleted = false; // Flag to track if task was completed successfully
      // Main agent execution loop
      for (let step = 0; step < maxSteps; step++) {
        // Handle pause/resume state
        if (this.state.paused) {
          await this.waitUntilResumed(); // Wait if agent is paused
        }
        // Check for stopping conditions
        if (this.state.consecutive_failures >= this.settings.maxFailures) {
          this.logger.error(`❌ Stopping due to ${this.settings.maxFailures} consecutive failures`);
          agentRunError = `Stopped due to ${this.settings.maxFailures} consecutive failures`;
          break;
        }
        if (this.state.stopped) {
          this.logger.info('🛑 Agent stopped programmatically.');
          agentRunError = 'Agent stopped programmatically';
          break;
        }
        // Delay loop while paused (in case waitUntilResumed doesn't fully block)
        while (this.state.paused) {
          await new Promise(resolve => setTimeout(resolve, 200));
          if (this.state.stopped) { // Allow stopping while actively paused
            agentRunError = 'Agent stopped programmatically while paused';
            break;
          }
        }
        // Execute onStepStart hook
        if (onStepStart) {
          await Promise.resolve(onStepStart(this));
        }
        const stepInfo: StepMetadata = {
          step_number: step,
          max_steps: maxSteps,
          step_start_time: Date.now() / 1000,
          step_end_time: 0, // Will be set in step() finally block
          input_tokens: 0 // Will be set in step() finally block
        };
        await this.step(stepInfo); // Execute a single agent step
        if (onStepEnd) {
          await Promise.resolve(onStepEnd(this));
        }
        // Check if the task is done after the step
        if (this.state.history.is_done()) {
          if (this.settings.validateOutput && step < maxSteps - 1) { // -1 because maxSteps is exclusive index
            if (!(await this._validateOutput())) {
              continue; // Validation failed, agent needs more steps
            }
          }
          await this.logCompletion(); // Log successful completion
          taskCompleted = true; // Mark as completed
          break; // Task completed
        }
      }
      // This block will execute if the loop completes *without* a break (i.e., maxSteps reached)
      // and the task was not marked as completed inside the loop.
      if (!taskCompleted && !agentRunError) {
        agentRunError = 'Failed to complete task within maximum steps.';
        this.state.history.history.push({
          model_output: null,
          result: [{ success: false, action: 'max_steps_reached', parameters: {}, error: agentRunError, timestamp: new Date(), duration: 0 }],
          state: { url: '', title: '', tabs: [], interacted_element: [], screenshot: null }, // Placeholder browser state
          metadata: null,
        });
        this.logger.info(`❌ ${agentRunError}`);
      }
      return this.state.history; // Return the full history
    } catch (e: any) {
      if (e instanceof AgentInterruptedError) {
        this.logger.info('Agent run interrupted programmatically, returning current history.');
        agentRunError = 'Interrupted by user or external signal.';
      } else {
        this.logger.error(`Agent run failed with unhandled exception: ${e.message}`, e);
        agentRunError = e.message;
        throw e; // Re-throw unhandled exceptions
      }
      return this.state.history; // Return current history on interruption/error
    } finally {
      process.removeListener('SIGINT', handleSIGINT);
      if (!this._forceExitTelemetryLogged) {
        try {
          this._logAgentEvent(maxSteps, agentRunError);
        } catch (logE: any) {
          this.logger.error(`Failed to log telemetry event during finalization: ${logE.message}`, logE);
        }
      } else {
        this.logger.info('Telemetry for force exit (SIGINT) was already logged by custom exit callback.');
      }
      this.eventBus.emit('UpdateAgentTaskEvent', UpdateAgentTaskEvent.fromAgent(this));
      if (this.settings.generateGif) {
        const outputPath: string = typeof this.settings.generateGif === 'string' ? this.settings.generateGif : 'agent_history.gif';
        this.logger.warn(`GIF generation is not fully implemented in Node.js version. Path: ${outputPath}`);
      }
      if (this.cloudSync) {
        await this.cloudSync.waitForAuth();
      }
      await this.close();
      this.logger.info('Agent run finalization complete.');
    }
  }
  /**
   * Executes a single step of the agent's task. This involves:
   * 1. Getting browser state summary.
   * 2. Updating action models with page-specific actions.
   * 3. Running the planner (if configured).
   * 4. Querying the LLM for the next action.
   * 5. Executing the decided actions.
   * 6. Updating agent state and history.
   * @param stepInfo Metadata about the current step number and total steps.
   */
  // Removed @timeExecutionAsync decorator, manual timing implemented
  async step(stepInfo: StepMetadata | null = null): Promise<void> {
    const startTime = Date.now(); // Manual timing start
    let browserStateSummary: BrowserStateSummary | null = null;
    let modelOutput: AgentOutput | null = null;
    let result: ActionResult[] = [];
    let tokens = 0;
    try {
      browserStateSummary = await this.browserManager.getStateSummary(true);
      const currentPage = await this.browserManager.getCurrentPage();
      this._logStepContext(currentPage, browserStateSummary);
      if (this.memory && this.state.n_steps % this.memory.config.memory_interval === 0) {
        await this.memory.createProceduralMemory(this.state.n_steps);
      }
      await this._raiseIfStoppedOrPaused();
      // CORRECTED: Call _updateActionModelsForPage as a private method of 'this'
      this._updateActionModelsForPage(currentPage);
      if (this.sensitiveData) {
        this.messageManager.addSensitiveData(currentPage.url());
      }
      if (this.toolCallingMethod === 'raw') {
        const pageFilteredActions = this.controller.getPromptDescription(currentPage);
        const allUnfilteredActions = this.controller.getPromptDescription();
        let allActions = allUnfilteredActions;
        if (pageFilteredActions) {
          allActions += '\n' + pageFilteredActions;
        }
        let updatedContext = (this.messageManager.settings.message_context || '').split('\n')
          .filter(line => !line.startsWith('Available actions:')).join('\n');
        if (updatedContext) {
          updatedContext += `\n\nAvailable actions: ${allActions}`;
        } else {
          updatedContext = `Available actions: ${allActions}`;
        }
        this.messageManager.settings.message_context = updatedContext;
      }
      this.messageManager.addStateMessage(
        browserStateSummary,
        this.state.last_result,
        stepInfo,
        this.settings.useVision
      );
      if (this.settings.plannerLlm && this.state.n_steps % this.settings.plannerInterval === 0) {
        const plan = await this._runPlanner();
        if (plan) {
          this.messageManager.addPlan(plan, -1);
        }
      }
      if (stepInfo && stepInfo.step_number === (stepInfo.max_steps! - 1)) {
        const msg = 'Now comes your last step. Use only the "done" action now. No other actions - so here your action sequence must have length 1.' +
                    '\nIf the task is not yet fully finished as requested by the user, set success in "done" to false! E.g. if not all steps are fully completed.' +
                    '\nIf the task is fully finished, set success in "done" to true.' +
                    '\nInclude everything you found out for the ultimate task in the done text.';
        this.logger.info('Last step finishing up');
        this.messageManager._addMessageWithTokens(new HumanMessage({ content: msg }));
        this.AgentOutputClass = this.DoneAgentOutputClass;
      }
      const inputMessages = this.messageManager.getMessages();
      tokens = this.messageManager.state.history.current_tokens;
      try {
        this._logLlmCallInfo(inputMessages, this.toolCallingMethod);
        modelOutput = await this.llmService.getNextAction(
          inputMessages,
          this.ActionModelClass,
          this.AgentOutputClass,
          this.toolCallingMethod,
          this.settings.maxActionsPerStep
        );
        if (!modelOutput.action || modelOutput.action.length === 0 || modelOutput.action.every(action => Object.keys(action.model_dump(true)).length === 0)) {
          this.logger.warn('Model returned empty action. Retrying with clarification...');
          const clarificationMessage = new HumanMessage({
            content: 'You forgot to return an action. Please respond only with a valid JSON action according to the expected format.'
          });
          const retryMessages = [...inputMessages, clarificationMessage];
          modelOutput = await this.llmService.getNextAction(
            retryMessages,
            this.ActionModelClass,
            this.AgentOutputClass,
            this.toolCallingMethod,
            this.settings.maxActionsPerStep
          );
          if (!modelOutput.action || modelOutput.action.length === 0 || modelOutput.action.every(action => Object.keys(action.model_dump(true)).length === 0)) {
            this.logger.warn('Model still returned empty after retry. Inserting safe noop action (done:false).');
            const noopAction = new this.ActionModelClass({
              done: { success: false, text: 'No next action returned by LLM!' },
            });
            modelOutput.action = [noopAction];
          }
        }
        this._logNextActionSummary(modelOutput);
        await this._raiseIfStoppedOrPaused();
        this.state.n_steps += 1;
        if (this.registerNewStepCallback) {
          await Promise.resolve(this.registerNewStepCallback(browserStateSummary, modelOutput, this.state.n_steps));
        }
        if (this.settings.saveConversationPath) {
          const conversationDir = path.resolve(this.settings.saveConversationPath);
          if (!fs.existsSync(conversationDir)) {
            fs.mkdirSync(conversationDir, { recursive: true });
          }
          const conversationFilename = `conversation_${this.id}_${this.state.n_steps}.txt`;
          const targetPath = path.join(conversationDir, conversationFilename);
          await saveConversation(inputMessages, modelOutput, targetPath, this.settings.saveConversationPathEncoding);
        }
        this.messageManager._removeLastStateMessage();
        await this._raiseIfStoppedOrPaused();
        if (modelOutput) {
            this.messageManager.addModelOutput(modelOutput);
        }
      } catch (e: any) {
        this.messageManager._removeLastStateMessage();
        if (e instanceof AgentInterruptedError) {
          throw e;
        }
        throw e;
      }
      if (modelOutput) {
        result = await this.multiAct(modelOutput.action); // Corrected: Call with 'this.'
        this.state.consecutive_failures = 0;
        this.state.last_result = result;
        if (result.length > 0 && result[result.length - 1].is_done) {
            this.logger.info(`📄 Result: ${result[result.length - 1].result}`);
        }
      } else {
          this.logger.error('Model did not provide valid actions. Skipping multiAct.');
          result = [{ success: false, action: 'error', parameters: {}, error: 'LLM failed to provide actions', timestamp: new Date(), duration: 0 }];
          this.state.last_result = result;
          this.state.consecutive_failures += 1;
      }
    } catch (e: any) {
      if (e instanceof AgentInterruptedError) {
        this.state.last_result = [{
          success: false, action: 'pause', parameters: {},
          error: 'The agent was paused mid-step - the last action might need to be repeated',
          timestamp: new Date(), duration: 0
        }];
        return;
      }
      result = await this._handleStepError(e);
      this.state.last_result = result;
    } finally {
      const stepEndTime = Date.now();
      // Manual timing log for step method
      this.logger.debug(`--step completed in ${stepEndTime - startTime}ms`);
      if (result && result.length > 0 && browserStateSummary && modelOutput) {
        const metadata: StepMetadata = {
          step_number: this.state.n_steps,
          step_start_time: startTime / 1000,
          step_end_time: stepEndTime / 1000,
          input_tokens: tokens,
          max_steps: stepInfo?.max_steps,
        };
        this._makeHistoryItem(modelOutput, browserStateSummary, result, metadata);
      }
      this._logStepCompletionSummary(startTime, result);
      if (browserStateSummary && modelOutput) {
        const actionsData = modelOutput.action.map(action => action.model_dump(true));
        const stepEvent = CreateAgentStepEvent.fromAgentStep(this, modelOutput, result, actionsData, browserStateSummary);
        this.eventBus.emit('CreateAgentStepEvent', stepEvent);
      }
    }
  }
  /**
   * Handles various types of errors that can occur during a step execution.
   * Increments failure count, logs errors, and handles specific error types
   * like rate limits or parsing failures.
   * @param error The error object.
   * @returns An array containing an `ActionResult` representing the error.
   */
  // Removed decorator, manual timing implemented
  private async _handleStepError(error: Error): Promise<ActionResult[]> {
    const startTime = Date.now(); // Manual timing start
    const includeTrace = true;
    const errorMsg = error.message;
    const prefix = `❌ Step failed ${this.state.consecutive_failures + 1}/${this.settings.maxFailures} times:\n `;
    this.state.consecutive_failures += 1;
    try {
      if (errorMsg.includes('Browser closed') || errorMsg.includes('Browser disconnected')) {
        this.logger.error('❌ Browser is closed or disconnected, unable to proceed.');
        return [{ success: false, action: 'error', parameters: {}, error: 'Browser closed or disconnected, unable to proceed', timestamp: new Date(), duration: 0 }];
      }
      if (error instanceof Error && (error.name === 'ValidationError' || error.message.includes('parse'))) {
        this.logger.error(`${prefix}${errorMsg}`);
        if (errorMsg.includes('Max token limit reached')) {
          this.messageManager.settings.max_input_tokens = this.settings.maxInputTokens - 500;
          this.logger.info(`Cutting tokens from history - new max input tokens: ${this.messageManager.settings.max_input_tokens}`);
          this.messageManager.cutMessages();
        } else if (errorMsg.includes('Could not parse response')) {
          return [{ success: false, action: 'error', parameters: {}, error: `${errorMsg}\n\nReturn a valid JSON object with the required fields.`, timestamp: new Date(), duration: 0 }];
        }
      }
      else if (error.message.includes('RateLimitError') || error.message.includes('ResourceExhausted')) {
        this.logger.warn(`${prefix}Rate Limit Exceeded. Retrying after delay...`);
        await new Promise(resolve => setTimeout(resolve, this.settings.retryDelay * 1000));
      }
      else {
        this.logger.error(`${prefix}${errorMsg}`, error);
      }
      return [{ success: false, action: 'error', parameters: {}, error: errorMsg, timestamp: new Date(), duration: 0 }];
    } finally {
      const duration = Date.now() - startTime; // Manual timing end
      this.logger.debug(`--handle_step_error (agent) completed in ${duration}ms`);
    }
  }
  /**
   * Creates and stores a history item for the completed step.
   * @param modelOutput The `AgentOutput` from the LLM for this step.
   * @param browserStateSummary The browser state at the start of the step.
   * @param result The results of actions executed in this step.
   * @param metadata Metadata about the step (timing, tokens).
   */
  private _makeHistoryItem(
    modelOutput: AgentOutput | null,
    browserStateSummary: BrowserStateSummary,
    result: ActionResult[],
    metadata: StepMetadata | null,
  ): void {
    const interactedElements = modelOutput ?
      this._getInteractedElementsFromOutput(modelOutput, browserStateSummary.selectorMap) : [null];
    const stateHistory: BrowserStateHistory = {
      url: browserStateSummary.url,
      title: browserStateSummary.title,
      tabs: browserStateSummary.tabs,
      interacted_element: interactedElements,
      screenshot: browserStateSummary.screenshot,
    };
    const historyItem: AgentHistory = {
      model_output: modelOutput,
      result: result,
      state: stateHistory,
      metadata: metadata,
    };
    this.state.history.history.push(historyItem);
  }
  /**
   * Extracts `DOMHistoryElement`s that were interacted with, based on the `AgentOutput`
   * and the current `selectorMap`.
   * @param modelOutput The LLM's `AgentOutput` for the step.
   * @param selectorMap The current browser's selector map (from `BrowserStateSummary`).
   * @returns An array of `DOMHistoryElement` or `null` for each action.
   */
  private _getInteractedElementsFromOutput(modelOutput: AgentOutput, selectorMap: Record<string, DOMHistoryElement>): (DOMHistoryElement | null)[] {
    return modelOutput.action.map((action: ActionModel) => {
      const index = action.get_index ? action.get_index() : null;
      if (index !== null && selectorMap[String(index)]) {
        return selectorMap[String(index)];
      }
      return null;
    });
  }
  /**
   * Logs initial agent run information.
   */
  private _logAgentRun(): void {
    this.logger.info(`🚀 Starting task: "${this.task}"`);
    this.logger.debug(
      `🤖 Browser-Use Library Version ${this.version} (${this.source}) with base_model=${this.llmService.modelName}` +
      `${this.toolCallingMethod === 'function_calling' ? ' +tools' : ''}` +
      `${this.toolCallingMethod === 'raw' ? ' +rawtools' : ''}` +
      `${this.settings.useVision ? ' +vision' : ''}` +
      `${this.memory ? ' +memory' : ''}` +
      ` extraction_model=${(this.settings.pageExtractionLlm as any)?.model_name || null}` +
      `${this.settings.plannerLlm ? ` planner_model=${(this.settings.plannerLlm as any)?.model_name || null}` : ''}` +
      `${this.settings.isPlannerReasoning ? ' +reasoning' : ''}` +
      `${this.settings.useVisionForPlanner ? ' +vision' : ''}`
    );
  }
  /**
   * Logs context information at the beginning of each step.
   * @param currentPage The current Playwright Page object.
   * @param browserStateSummary The summary of the current browser state.
   */
  private _logStepContext(currentPage: any, browserStateSummary: BrowserStateSummary): void {
    const urlShort = currentPage.url().length > 50 ? currentPage.url().substring(0, 50) + '...' : currentPage.url();
    const interactiveCount = browserStateSummary?.selectorMap ? Object.keys(browserStateSummary.selectorMap).length : 0;
    this.logger.info(
      `📍 Step ${this.state.n_steps}: Evaluating page with ${interactiveCount} interactive elements on: ${urlShort}`
    );
  }
  /**
   * Logs a comprehensive summary of the next action(s) decided by the LLM.
   * @param parsed The parsed `AgentOutput` from the LLM.
   */
  private _logNextActionSummary(parsed: AgentOutput): void {
    if (!parsed.action || parsed.action.length === 0) {
      return;
    }
    const actionCount = parsed.action.length;
    const actionDetails: string[] = [];
    for (const action of parsed.action) {
      const actionData = action.model_dump(true);
      const actionName = action.getActionName();
      const actionParams = action.getParams();
      const paramSummary: string[] = [];
      if (typeof actionParams === 'object') {
        for (const key in actionParams) {
          const value = actionParams[key];
          if (key === 'index') {
            paramSummary.push(`#${value}`);
          } else if (key === 'text' && typeof value === 'string') {
            const textPreview = value.length > 30 ? value.substring(0, 30) + '...' : value;
            paramSummary.push(`text="${textPreview}"`);
          } else if (key === 'url') {
            paramSummary.push(`url="${value}"`);
          } else if (key === 'success') {
            paramSummary.push(`success=${value}`);
          } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            if (String(value).length < 20) {
              paramSummary.push(`${key}=${value}`);
            }
          }
        }
      }
      const paramStr = paramSummary.length > 0 ? `(${paramSummary.join(', ')})` : '';
      actionDetails.push(`${actionName}${paramStr}`);
    }
    if (actionCount === 1) {
      this.logger.info(`☝️ Decided next action: ${actionDetails[0]}`);
    } else {
      const summaryLines = [`✌️ Decided next ${actionCount} multi-actions:`];
      actionDetails.forEach((detail, i) => {
        summaryLines.push(`          ${i + 1}. ${detail}`);
      });
      this.logger.info('\n' + summaryLines.join('\n'));
    }
  }
  /**
   * Logs a summary of the completed step, including action count, timing, and success/failure.
   * @param stepStartTime The start timestamp of the step.
   * @param result The list of `ActionResult`s for the executed actions.
   */
  private _logStepCompletionSummary(stepStartTime: number, result: ActionResult[]): void {
    if (!result || result.length === 0) {
      return;
    }
    const stepDuration = (Date.now() - stepStartTime) / 1000;
    const actionCount = result.length;
    const successCount = result.filter(r => r.success).length;
    const failureCount = actionCount - successCount;
    const successIndicator = successCount > 0 ? `✅ ${successCount}` : '';
    const failureIndicator = failureCount > 0 ? `❌ ${failureCount}` : '';
    const statusParts = [successIndicator, failureIndicator].filter(Boolean);
    const statusStr = statusParts.length > 0 ? statusParts.join(' | ') : '✅ 0';
    this.logger.info(`📍 Step ${this.state.n_steps}: Ran ${actionCount} actions in ${stepDuration.toFixed(2)}s: ${statusStr}`);
  }
  /**
   * Logs comprehensive information about the LLM call being made.
   * @param inputMessages The messages sent to the LLM.
   * @param method The tool calling method used.
   */
  private _logLlmCallInfo(inputMessages: BaseMessage[], method: ToolCallingMethod | null): void {
    const messageCount = inputMessages.length;
    const totalChars = inputMessages.reduce((sum, msg) => sum + String(msg.content).length, 0);
    const hasImages = inputMessages.some(msg =>
      Array.isArray(msg.content) && msg.content.some((item: any) => item.type === 'image_url')
    );
    const currentTokens = this.messageManager.state.history.current_tokens;
    const toolCount = this.controller.getActionsSchema().length;
    const imageStatus = hasImages ? ', 📷 img' : '';
    let outputFormat: string;
    let toolInfo: string;
    if (method === 'raw') {
      outputFormat = '=> raw text';
      toolInfo = '';
    } else {
      outputFormat = '=> JSON out';
      toolInfo = ` + 🔨 ${toolCount} tools (${method})`;
    }
    const termWidth = process.stdout.columns || 80;
    console.log('='.repeat(termWidth));
    this.logger.info(
      `🧠 LLM call => ${this.llmService.chatModelLibrary} [✉️ ${messageCount} msg, ~${currentTokens} tk, ${totalChars} char${imageStatus}] ${outputFormat}${toolInfo}`
    );
  }
  /**
   * Logs a telemetry event for the agent run's completion or failure.
   * @param maxSteps The maximum number of steps configured for the run.
   * @param agentRunError An optional error message if the run failed.
   */
  private _logAgentEvent(maxSteps: number, agentRunError: string | null = null): void {
    const actionHistoryData = this.state.history.history.map((item: AgentHistory) =>
      item.model_output?.action?.map((action: ActionModel) => action.model_dump(true)) || null
    );
    const finalRes = this.state.history.is_successful() ? this.state.history.final_result() : null;
    const finalResultStr = finalRes !== null ? JSON.stringify(finalRes) : null;
    this.telemetry.capture(
      new AgentTelemetryEvent({
        task: this.task,
        model: this.llmService.modelName,
        modelProvider: this.llmService.chatModelLibrary,
        plannerLlm: this.settings.plannerLlm ? (this.settings.plannerLlm as any).model_name : null,
        maxSteps: maxSteps,
        maxActionsPerStep: this.settings.maxActionsPerStep,
        useVision: this.settings.useVision,
        useValidation: this.settings.validateOutput,
        version: this.version,
        source: this.source,
        actionErrors: this.state.history.errors(),
        actionHistory: actionHistoryData,
        urlsVisited: this.state.history.urls(),
        steps: this.state.n_steps,
        totalInputTokens: this.state.history.total_input_tokens(),
        totalDurationSeconds: this.state.history.total_duration_seconds(),
        success: this.state.history.is_successful(),
        finalResultResponse: finalResultStr,
        errorMessage: agentRunError,
      })
    );
  }
  /**
   * Validates the output of the last action (typically a 'done' action)
   * against the original task using an LLM-based validator.
   * @returns A Promise that resolves to `true` if the output is valid, `false` otherwise.
   */
  private async _validateOutput(): Promise<boolean> {
    const systemMsg =
      `You are a validator of an agent who interacts with a browser. ` +
      `Validate if the output of last action is what the user wanted and if the task is completed. ` +
      `If the task is unclear defined, you can let it pass. But if something is missing or the image does not show what was requested dont let it pass. ` +
      `Try to understand the page and help the model with suggestions like scroll, do x, ... to get the solution right. ` +
      `Task to validate: ${this.task}. Return a JSON object with 2 keys: is_valid and reason. ` +
      `is_valid is a boolean that indicates if the output is correct. ` +
      `reason is a string that explains why it is valid or not.` +
      ` example: {"is_valid": false, "reason": "The user wanted to search for "cat photos", but the agent searched for "dog photos" instead."}`;
    const browserStateSummary = await this.browserManager.getStateSummary(false);
    if (!browserStateSummary) {
      this.logger.warn('No browser state summary available for validation. Skipping validation.');
      return true;
    }
    const validationMessageContent: BaseMessage['content'] = [
      { type: 'text', text: `Current Browser State:\nURL: ${browserStateSummary.url}\nTitle: ${browserStateSummary.title}` },
      { type: 'text', text: `\nPrevious Action Results:\n${JSON.stringify(this.state.last_result)}`},
    ];
    if (this.settings.useVision && browserStateSummary.screenshot) {
      validationMessageContent.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${browserStateSummary.screenshot}` } });
    }
    const msg = [
      new SystemMessage({ content: systemMsg }),
      new HumanMessage({ content: validationMessageContent })
    ];
    const ValidationResultSchema = {
      parse: (input: any) => {
        if (typeof input.is_valid === 'boolean' && typeof input.reason === 'string') {
          return { is_valid: input.is_valid, reason: input.reason };
        }
        throw new Error('Invalid ValidationResult structure from LLM.');
      },
      getSchema: () => ({
        type: 'object',
        properties: {
          is_valid: { type: 'boolean', description: 'True if the output is valid and task completed, false otherwise.' },
          reason: { type: 'string', description: 'Explanation for the validation decision.' },
        },
        required: ['is_valid', 'reason'],
      }),
    };
    const validatorLLM = this.llmService.llm.withStructuredOutput(ValidationResultSchema, {
      includeRaw: true,
      method: this.toolCallingMethod || undefined
    });
    try {
      const response = await validatorLLM.invoke(msg);
      const parsed = (response as any).parsed;

      if (!parsed.is_valid) {
        this.logger.info(`❌ Validator decision: ${parsed.reason}`);
        const errorMsg = `The output is not yet correct. ${parsed.reason}.`;
        this.state.last_result = [{ success: false, action: 'validation', parameters: {}, error: errorMsg, timestamp: new Date(), duration: 0 }];
      } else {
        this.logger.info(`✅ Validator decision: ${parsed.reason}`);
      }
      return parsed.is_valid;
    } catch (error: any) {
      this.logger.error(`Failed to invoke validator LLM or parse its response: ${error.message}`, error);
      return false;
    }
  }
  /**
   * Executes the planner LLM to analyze the current state and suggest next steps.
   * @returns A Promise that resolves with the planner's output (plan string) or `null` if no planner is configured.
   */
  private async _runPlanner(): Promise<string | null> {
    if (!this.settings.plannerLlm) {
      return null;
    }
    const currentPage = await this.browserManager.getCurrentPage();
    const standardActions = this.controller.getPromptDescription();
    const pageActions = this.controller.getPromptDescription(currentPage);
    let allActions = standardActions;
    if (pageActions) {
      allActions += '\n' + pageActions;
    }
    const plannerSystemMessage = new SystemMessage({
      content: `You are a planner for a browser automation agent. Analyze the current state and suggest next steps.
Available actions: ${allActions}
${this.settings.isPlannerReasoning ? 'Provide your reasoning in <think> tags before the plan. The reasoning will be removed before execution.' : ''}
${this.settings.extendPlannerSystemMessage || ''}`
    });
    const plannerMessages: BaseMessage[] = [
      plannerSystemMessage,
      ...this.messageManager.getMessages().slice(1),
    ];
    if (!this.settings.useVisionForPlanner && this.settings.useVision) {
      const lastStateMessage = plannerMessages[plannerMessages.length - 1];
      if (lastStateMessage instanceof HumanMessage && Array.isArray(lastStateMessage.content)) {
        const newContent = lastStateMessage.content.filter((part: any) => part.type === 'text');
        if (newContent.length > 0) {
          plannerMessages[plannerMessages.length - 1] = new HumanMessage({ content: newContent });
        } else {
          plannerMessages[plannerMessages.length - 1] = new HumanMessage({ content: 'Previous browser state summary (image content removed for planner LLM).' });
        }
      }
    }
    const convertedPlannerMessages = convertInputMessages(plannerMessages, (this.settings.plannerLlm as any)?.model_name || 'unknown');
    try {
      const response = await this.settings.plannerLlm.invoke(convertedPlannerMessages);
      let plan = String(response.content || '').trim();
      if (this.llmService.modelName && (this.llmService.modelName.includes('deepseek-r1') || this.llmService.modelName.includes('deepseek-reasoner'))) {
        plan = this.llmService.removeThinkTags(plan);
      }
      try {
        const planJson = extractJsonFromModelOutput(plan);
        this.logger.info(`Planning Analysis:\n${JSON.stringify(planJson, null, 4)}`);
      } catch (e) {
        this.logger.info(`Planning Analysis:\n${plan}`);
      }
      return plan;
    } catch (e: any) {
      this.logger.error(`Failed to invoke planner: ${e.message}`);
      throw new Error(`Planner LLM API call failed: ${e.message}`);
    }
  }
  /**
   * Logs the completion of the task (success or failure).
   */
  async logCompletion(): Promise<void> {
    if (this.state.history.is_successful()) {
      this.logger.info('✅ Task completed successfully!');
    } else {
      this.logger.info('❌ Task completed without success.');
    }
    const totalTokens = this.state.history.total_input_tokens();
    this.logger.debug(`💲 Total input tokens used (approximate): ${totalTokens}`);
    // Trigger external done callback
    if (this.registerDoneCallback) {
      await Promise.resolve(this.registerDoneCallback(this.state.history));
    }
  }
  /**
   * Replays a saved history of actions, allowing for re-execution of a task.
   * Includes error handling and retry logic.
   * @param history The `AgentHistoryList` to replay.
   * @param maxRetries Maximum number of retries for a failed action (default: 3).
   * @param skipFailures Whether to skip failed actions or stop execution (default: `true`).
   * @param delayBetweenActions Delay between actions in seconds (default: 2.0).
   * @returns A Promise that resolves with an array of `ActionResult` objects from the rerun.
   */
  // Removed decorator, manual timing implemented
  public async rerunHistory( // Made public as it's an exposed agent method
    history: AgentHistoryList,
    maxRetries: number = 3,
    skipFailures: boolean = true,
    delayBetweenActions: number = 2.0,
  ): Promise<ActionResult[]> {
    const startTime = Date.now(); // Manual timing start
    try {
      if (!this.browserManager.getCurrentPageSync()) {
          this.logger.error('Browser not launched for rerunHistory. Call Controller.init() first.');
          throw new Error('Browser not launched. Cannot rerun history.');
      }
      if (this.initialActions && this.initialActions.length > 0) {
        const result = await this.multiAct(this.initialActions);
        this.state.last_result = result;
      }
      const allRerunResults: ActionResult[] = [];
      for (let i = 0; i < history.history.length; i++) {
        const historyItem: AgentHistory = history.history[i];
        const goal = historyItem.model_output?.current_state.next_goal || 'No goal specified';
        this.logger.info(`Replaying step ${i + 1}/${history.history.length}: Goal: "${goal}"`);
        if (!historyItem.model_output || !historyItem.model_output.action || historyItem.model_output.action.length === 0) {
          this.logger.warn(`Step ${i + 1}: No action to replay, skipping.`);
          allRerunResults.push({ success: true, action: 'replay_skip', parameters: {}, result: 'No action recorded for this step.', timestamp: new Date(), duration: 0 });
          continue;
        }
        let retryCount = 0;
        let stepExecutionSuccessful = false;
        while (retryCount < maxRetries) {
          try {
            const stepResults = await this._executeHistoryStep(historyItem, delayBetweenActions);
            allRerunResults.push(...stepResults);
            stepExecutionSuccessful = true;
            break;
          } catch (e: any) {
            retryCount++;
            if (retryCount === maxRetries) {
              const errorMsg = `Step ${i + 1} failed after ${maxRetries} attempts: ${e.message}`;
              this.logger.error(errorMsg);
              allRerunResults.push({ success: false, action: 'replay_fail', parameters: {}, error: errorMsg, timestamp: new Date(), duration: 0 });
              if (!skipFailures) {
                throw new Error(`Rerun history stopped due to unhandled failure: ${errorMsg}`);
              }
            } else {
              this.logger.warn(`Step ${i + 1} failed (attempt ${retryCount}/${maxRetries}), retrying...`);
              await new Promise(resolve => setTimeout(resolve, delayBetweenActions * 1000));
            }
          }
        }
        if (!stepExecutionSuccessful && !skipFailures) {
            break;
        }
      }
      return allRerunResults;
    } finally {
      const duration = Date.now() - startTime; // Manual timing end
      this.logger.debug(`--rerunHistory completed in ${duration}ms`);
    }
  }
  /**
   * Executes a single step from a historical record, updating action indices
   * to match the current DOM state.
   * @param historyItem The `AgentHistory` item to execute.
   * @param delay Delay in seconds between actions within this step.
   * @returns A Promise that resolves with an array of `ActionResult` for the step.
   * @throws An error if browser state is invalid or an element cannot be found.
   */
  private async _executeHistoryStep(historyItem: AgentHistory, delay: number): Promise<ActionResult[]> {
    const browserStateSummary = await this.browserManager.getStateSummary(false);
    if (!browserStateSummary || !historyItem.model_output) {
      throw new Error('Invalid browser state or historical model output for step execution.');
    }
    const updatedActions: ActionModel[] = [];
    for (let i = 0; i < historyItem.model_output.action.length; i++) {
      const historicalElement = historyItem.state.interacted_element[i];
      const action: ActionModel = historyItem.model_output.action[i];
      const updatedAction = this._updateActionIndices(historicalElement, action, browserStateSummary);
      if (updatedAction === null) {
        throw new Error(`Could not find matching element for action ${i + 1} in current page during history rerun.`);
      }
      updatedActions.push(updatedAction);
    }
    const result = await this.multiAct(updatedActions); // Corrected: Call with 'this.'
    await new Promise(resolve => setTimeout(resolve, delay * 1000));
    return result;
  }
  /**
   * Updates an action's element `highlight_index` to match the current page's DOM state.
   * This uses `HistoryTreeProcessor` to find the corresponding element.
   * @param historicalElement The historical `DOMHistoryElement` that the action was originally targeting.
   * @param action The `ActionModel` instance whose index needs updating.
   * @param browserStateSummary The current `BrowserStateSummary` for finding elements.
   * @returns The updated `ActionModel` or `null` if the historical element cannot be found in the current DOM.
   */
  private _updateActionIndices(
    historicalElement: DOMHistoryElement | null,
    action: ActionModel,
    browserStateSummary: BrowserStateSummary,
  ): ActionModel | null {
    if (!historicalElement || !browserStateSummary.selectorMap) {
      return action;
    }
    const currentElement = HistoryTreeProcessor.findHistoryElementInTree(
      historicalElement,
      browserStateSummary.selectorMap
    );
    if (!currentElement || currentElement.highlight_index === null) {
      this.logger.warn(`Historical element (node_id: ${historicalElement.node_id}) not found in current DOM for action: ${action.getActionName()}.`);
      return null;
    }
    const oldIndex = action.get_index ? action.get_index() : null;
    if (oldIndex !== currentElement.highlight_index) {
      action.set_index!(currentElement.highlight_index);
      this.logger.info(`Element moved in DOM, updated index for action "${action.getActionName()}" from ${oldIndex} to ${currentElement.highlight_index}.`);
    }
    return action;
  }
  /**
   * Loads agent history from a specified file and reruns it.
   * @param historyFile Optional path to the history file (defaults to 'AgentHistory.json').
   * @param kwargs Additional arguments passed to `rerunHistory` (e.g., `maxRetries`, `skipFailures`).
   * @returns A Promise that resolves with an array of `ActionResult` objects from the rerun.
   */
  public async loadAndRerun(historyFile: string | null = null, kwargs: Record<string, any> = {}): Promise<ActionResult[]> {
    historyFile = historyFile || 'AgentHistory.json';
    const history = AgentHistoryList.load_from_file(historyFile, this.AgentOutputClass);
    return await this.rerunHistory(
      history,
      kwargs.maxRetries,
      kwargs.skipFailures,
      kwargs.delayBetweenActions
    );
  }
  /**
   * Saves the current agent history to a file.
   * @param filePath Optional path to save the history file (defaults to 'AgentHistory.json').
   */
  public saveHistory(filePath: string | null = null): void {
    filePath = filePath || 'AgentHistory.json';
    this.state.history.save_to_file(filePath);
    this.logger.info(`Agent history saved to ${filePath}.`);
  }
  /**
   * Waits until the agent is resumed from a paused state.
   * @returns A Promise that resolves when the agent is resumed.
   */
  public async waitUntilResumed(): Promise<void> {
    return new Promise(resolve => {
      this._externalPauseEvent.once('resume', resolve);
      this.logger.info('Agent is paused. Waiting for resume signal...');
    });
  }
  /**
   * Pauses the agent's execution.
   * Displays a message to the user about resuming or quitting.
   */
  public pause(): void {
    if (this.state.paused || this.state.stopped) {
      this.logger.warn('Agent is already paused or stopped. Ignoring pause request.');
      return;
    }
    this.logger.info(
      '\n\n⏸️ Got [Ctrl+C], paused the agent and left the browser open.\n\tPress [Enter] to resume or [Ctrl+C] again to quit.'
    );
    this.state.paused = true;
    this._externalPauseEvent.emit('pause');
  }
  /**
   * Resumes the agent's execution from a paused state.
   * Displays a message and emits a 'resume' event.
   */
  public resume(): void {
    if (!this.state.paused) {
      this.logger.warn('Agent is not paused. Ignoring resume request.');
      return;
    }
    this.logger.info('----------------------------------------------------------------------');
    this.logger.info('▶️ Got Enter, resuming agent execution where it left off...\n');
    this.state.paused = false;
    this._externalPauseEvent.emit('resume');
  }
  /**
   * Stops the agent's execution programmatically.
   */
  public stop(): void {
    if (this.state.stopped) {
      this.logger.warn('Agent is already stopped. Ignoring stop request.');
      return;
    }
    this.logger.info('⏹️ Agent stopping programmatically.');
    this.state.stopped = true;
    if (this.state.paused) {
      this._externalPauseEvent.emit('resume');
    }
  }
  /**
   * Closes all resources managed by the agent, including the browser.
   */
  public async close(): Promise<void> {
    try {
      await this.browserManager.close();
    } catch (e: any) {
      this.logger.error(`Error during cleanup: ${e.message}`, e);
    } finally {
      this.eventBus.removeAllListeners();
      this.logger.info('Event bus listeners removed during agent close.');
    }
  }
  // --- PRIVATE HELPER METHODS (Implemented to resolve errors) ---
  /**
   * Private helper method to update ActionModel and AgentOutput classes based on current page.
   * In the Python version, this creates new Pydantic models with page-specific filters.
   * In TypeScript, it ensures the correct class constructors are referenced.
   * @param currentPage The current Playwright Page object.
   */
  private _updateActionModelsForPage(currentPage: any): void {
    this.ActionModelClass = this.controller.createActionModel({ page: currentPage });
    this.AgentOutputClass = AgentOutput.typeWithCustomActions(this.ActionModelClass);
    this.DoneActionModelClass = this.controller.createActionModel({ includeActions: ['done'], page: currentPage });
    this.DoneAgentOutputClass = AgentOutput.typeWithCustomActions(this.DoneActionModelClass);
  }
  /**
   * Private helper method to execute multiple actions sequentially.
   * This was previously called without `this.`.
   * @param actions An array of `ActionModel` instances to execute.
   * @param checkForNewElements If true, checks for new elements on the page after each action
   * and breaks execution if new elements appear (default: `true`).
   * @returns A Promise that resolves with an array of `ActionResult` for each executed action.
   */
  private async multiAct(actions: ActionModel[], checkForNewElements: boolean = true): Promise<ActionResult[]> {
    const results: ActionResult[] = [];
    // Cache initial selector map for detecting DOM changes
    const initialBrowserStateSummary = await this.browserManager.getStateSummary(true);
    const cachedSelectorMap = initialBrowserStateSummary.selectorMap;
    const cachedPathHashes = new Set(Object.values(cachedSelectorMap).map(e => e.hash.branch_path_hash));
    await this.browserManager.removeHighlights(); // Remove any existing highlights before actions
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const actionIndex = action.get_index ? action.get_index() : null;
      // Check for DOM changes *after* the first action (i.e., after the page potentially changes)
      if (actionIndex !== null && i !== 0) {
        const newBrowserStateSummary = await this.browserManager.getStateSummary(false); // Don't re-cache hashes
        const newSelectorMap = newBrowserStateSummary.selectorMap;
        // Detect if the targeted element's hash has changed (meaning the element moved/changed)
        const origTarget = cachedSelectorMap[String(actionIndex)];
        const origTargetHash = origTarget?.hash.branch_path_hash;
        const newTarget = newSelectorMap[String(actionIndex)];
        const newTargetHash = newTarget?.hash.branch_path_hash;
        if (origTargetHash && newTargetHash && origTargetHash !== newTargetHash) {
          const msg = `Element targeted by action ${i + 1}/${actions.length} (index ${actionIndex}) changed after previous action, because page DOM structure changed unexpectedly.`;
          this.logger.info(msg);
          results.push({ success: false, action: action.getActionName(), parameters: action.getParams(), error: msg, timestamp: new Date(), duration: 0 });
          break; // Stop multi-action execution
        }
        // Check for new elements appearing on the page (if enabled)
        const newPathHashes = new Set(Object.values(newSelectorMap).map(e => e.hash.branch_path_hash));
        if (checkForNewElements && !Array.from(newPathHashes).every(hash => cachedPathHashes.has(hash))) {
          const msg = `Something new appeared on the page after action ${i + 1}/${actions.length}. Halting multi-action execution to re-evaluate the page.`;
          this.logger.info(msg);
          results.push({ success: false, action: action.getActionName(), parameters: action.getParams(), error: msg, timestamp: new Date(), duration: 0 });
          break; // Stop multi-action execution
        }
      }
      try {
        await this._raiseIfStoppedOrPaused(); // Check for pause/stop before executing action
        // Execute the action using the Controller
        const result = await this.controller.executeAction(
          action.getActionName(),
          action.getParams()
        );
        results.push(result);
        this.logger.info(`☑️ Executed action ${i + 1}/${actions.length}: ${action.getActionName()}(${JSON.stringify(action.getParams())})`);
        // If the action signals done, or fails, or is the last in the sequence, break
        if (result.is_done || !result.success || i === actions.length - 1) {
          break;
        }
        // Wait a small delay between actions (configurable in BrowserProfile)
        await new Promise(resolve => setTimeout(resolve, this.browserManager.browserProfile.wait_between_actions * 1000));
      } catch (e: any) {
        if (e instanceof AgentInterruptedError) {
          this.logger.info(`Action ${i + 1} was cancelled due to pause/stop signal.`);
          if (!results.length) { // Add a result for the cancelled action if none exist
            results.push({ success: false, action: action.getActionName(), parameters: action.getParams(), error: 'The action was cancelled due to a pause/stop signal.', timestamp: new Date(), duration: 0 });
          }
          throw new AgentInterruptedError('Action cancelled by user or signal'); // Re-throw for higher-level handling
        } else {
          // Log action execution errors, but don't re-throw immediately here unless fatal
          // These errors will be captured in the `result` object and handled by `_handleStepError`
          this.logger.error(`Error executing action ${i + 1}/${actions.length} (${action.getActionName()}): ${e.message}`);
          results.push({ success: false, action: action.getActionName(), parameters: action.getParams(), error: e.message, timestamp: new Date(), duration: 0 });
          break; // Break multi-act loop on error
        }
      }
    }
    return results;
  }
}