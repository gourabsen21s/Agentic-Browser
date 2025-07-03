// src/shared/types.ts

import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Page, BrowserContext, Browser } from 'playwright';
import { z } from 'zod'; // Import Zod for schema definitions
import * as fs from 'fs'; // Required for CreateAgentOutputFileEvent


// --- Playwright Base Types (re-exported for convenience and potential future extension) ---
export { Page, BrowserContext, Browser };

// --- Logging Interface ---
export interface AppLogger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

// --- Action Registry Types ---
export type ActionParameterType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';

export interface ActionParameter {
  type: ActionParameterType;
  required: boolean;
  description: string;
  properties?: { [key: string]: ActionParameter }; // For 'object' types, defines nested properties
  items?: ActionParameter; // For 'array' types, defines the type of array elements
  pattern?: string; // For 'string' type, a regex pattern for validation
  enum?: (string | number | boolean)[]; // Allowed values for string/number/boolean types
  minimum?: number; // Minimum value for 'number' type
  maximum?: number; // Maximum value for 'number' type
}

export interface ActionDefinition {
  name: string;
  description: string;
  parameters: {
    [key: string]: ActionParameter;
  };
  execute: (params: Record<string, any>) => Promise<any>;
}

// --- Browser-related Types ---
export interface BrowserProfile {
  keep_alive: boolean;
  allowed_domains: string[];
  wait_between_actions: number;
  userAgent?: string; // Added userAgent to BrowserProfile as it affects context creation
}

export interface DOMHistoryElement {
  node_id: string; // Unique ID for the DOM node
  highlight_index: number | null; // Index used for highlighting
  hash: {
    branch_path_hash: string; // Hash representing the element's position in the DOM tree
  };
  tagName?: string; // e.g., 'DIV', 'A'
  attributes?: Record<string, string>; // All HTML attributes
  text?: string; // Text content of the element
  boundingBox?: { x: number; y: number; width: number; height: number } | null; // Position and size
  // Add other properties from Python's DOMHistoryElement
}

export interface ClickableElement {
  selector: string; // CSS selector to locate the element
  boundingBox: { x: number; y: number; width: number; height: number } | null; // Bounding box for visual location
  tagName: string; // HTML tag name (e.g., 'a', 'button')
  text: string; // Visible text content
  attributes: Record<string, string>; // All element attributes
  index: number; // A unique index for the element (e.g., for easy reference in agent output)
}

export interface DomTreeResult {
  rootId: string;
  map: Record<string, any>; // A map of element IDs to their structured data
  perfMetrics?: any; // Performance metrics of DOM tree building
}

export interface BrowserStateSummary {
  url: string;
  title: string;
  screenshot: string | null;
  tabs: Array<{ id: number; title: string; url: string; active: boolean }>;
  selectorMap: Record<string, DOMHistoryElement>; // CORRECTED: Changed from selector_map to selectorMap
}

// CORRECTED: Added export
export interface BrowserStateHistory {
  url: string;
  title: string;
  tabs: Array<{ id: number; title: string; url: string; active: boolean }>;
  interacted_element: (DOMHistoryElement | null)[]; // Elements interacted with in this step
  screenshot: string | null;
}

// --- Controller Action Result ---
export interface ActionResult {
  success: boolean;
  action: string;
  parameters: Record<string, any>;
  result?: any;
  error?: string;
  timestamp: Date;
  duration: number;
  is_done?: boolean;
}

// --- Agent-related Types ---
export type ToolCallingMethod = 'auto' | 'function_calling' | 'tools' | 'json_mode' | 'raw';

export interface AgentSettings {
  useVision: boolean;
  useVisionForPlanner: boolean;
  saveConversationPath: string | null;
  saveConversationPathEncoding: string | null;
  maxFailures: number;
  retryDelay: number;
  overrideSystemMessage: string | null;
  extendSystemMessage: string | null;
  maxInputTokens: number;
  validateOutput: boolean;
  messageContext: string | null;
  generateGif: boolean | string;
  availableFilePaths: string[] | null;
  includeAttributes: string[];
  maxActionsPerStep: number;
  toolCallingMethod: ToolCallingMethod;
  pageExtractionLlm: BaseChatModel | null;
  plannerLlm: BaseChatModel | null;
  plannerInterval: number;
  isPlannerReasoning: boolean;
  extendPlannerSystemMessage: string | null;
}

export interface AgentBrain {
  page_summary: string;
  evaluation_previous_goal: string;
  memory: string;
  next_goal: string;
}

// Action Model (dynamic structure representing the LLM's chosen action)
export class ActionModel {
  private _actionData: Record<string, any>;

  constructor(data: Record<string, any>) {
    if (Object.keys(data).length !== 1) {
      throw new Error("ActionModel expects exactly one action key-value pair at construction.");
    }
    this._actionData = data;
    Object.assign(this, data); // Assign dynamic property directly for easier access
  }

  // --- Fixed Methods for ActionModel Instances ---
  get_index(): number | null {
    const actionParams = this.getParams();
    return (actionParams && typeof actionParams.index === 'number') ? actionParams.index : null;
  }

  set_index(newIndex: number): void {
    const actionParams = this.getParams();
    if (actionParams && typeof actionParams === 'object') {
      actionParams.index = newIndex;
    }
  }

  is_done(): boolean {
    return Object.keys(this._actionData)[0] === 'done';
  }

  model_dump(exclude_unset: boolean = false): Record<string, any> {
    const dumped: Record<string, any> = {};
    const actionName = Object.keys(this._actionData)[0];
    const actionParams = this._actionData[actionName];

    if (actionParams && typeof actionParams === 'object') {
      const copiedParams: Record<string, any> = {};
      for (const key in actionParams) {
        if (Object.prototype.hasOwnProperty.call(actionParams, key)) {
          if (exclude_unset && actionParams[key] === undefined) {
            continue;
          }
          copiedParams[key] = actionParams[key];
        }
      }
      dumped[actionName] = copiedParams;
    } else {
      dumped[actionName] = actionParams;
    }
    return dumped;
  }

  getParams(): Record<string, any> {
    const actionName = Object.keys(this._actionData)[0];
    return this._actionData[actionName];
  }

  getActionName(): string {
    return Object.keys(this._actionData)[0];
  }
}

// Output structure received from the LLM after processing messages
export class AgentOutput {
  current_state: AgentBrain;
  action: ActionModel[];

  constructor(data: { current_state: AgentBrain; action: ActionModel[] }) {
    this.current_state = data.current_state;
    this.action = data.action;
  }

  // Static method to create AgentOutput from a plain JSON object (for loading history)
  static fromJSON(json: any): AgentOutput {
    const current_state: AgentBrain = {
      page_summary: json.current_state?.page_summary || '',
      evaluation_previous_goal: json.current_state?.evaluation_previous_goal || '',
      memory: json.current_state?.memory || '',
      next_goal: json.current_state?.next_goal || '',
    };

    const actions: ActionModel[] = (json.action || []).map((a: any) => new ActionModel(a));

    return new AgentOutput({ current_state, action: actions });
  }

  // This factory method simulates Python's dynamic Pydantic model creation
  static typeWithCustomActions(ActionModelClass: typeof ActionModel): typeof AgentOutput {
    return AgentOutput;
  }

  // Converts the AgentOutput instance to a plain JavaScript object for serialization
  model_dump(exclude_unset: boolean = false): Record<string, any> {
    const dumped: Record<string, any> = {
      current_state: this.current_state,
      action: this.action.map(a => a.model_dump(exclude_unset))
    };
    return dumped;
  }
}


// State for the MessageManager service
export interface MessageManagerSettings {
  max_input_tokens: number;
  include_attributes: string[];
  message_context: string | null;
  sensitive_data: Record<string, string | Record<string, string>> | null;
  available_file_paths: string[] | null;
}

// The internal state of the MessageManager, including message history
export interface MessageManagerState {
  history: {
    messages: BaseMessage[];
    current_tokens: number; // Approximate token count
  };
}

// Configuration for the Memory service
export interface MemoryConfig {
  memory_interval: number; // How often to create procedural memory
}

// CORRECTED: Added export
export interface AgentState {
  n_steps: number;
  consecutive_failures: number;
  stopped: boolean;
  paused: boolean;
  last_result: ActionResult[] | null;
  history: AgentHistoryList; // Reference to the AgentHistoryList interface
  message_manager_state: MessageManagerState; // State of the MessageManager
}

// Metadata for a single agent step
export interface StepMetadata {
  step_number: number;
  step_start_time: number; // Unix timestamp in seconds
  step_end_time: number;   // Unix timestamp in seconds
  input_tokens: number; // Tokens used for LLM input in this step
  max_steps?: number; // Total max steps for the run (from AgentStepInfo)
}

// CORRECTED: Added export
export interface AgentHistory {
  model_output: AgentOutput | null;
  result: ActionResult[];
  state: BrowserStateHistory;
  metadata: StepMetadata | null;
}

// The complete history of an agent's run
export class AgentHistoryList {
  history: AgentHistory[] = [];

  is_successful(): boolean {
    const lastItem = this.history[this.history.length - 1];
    if (lastItem?.model_output?.action) {
      const doneAction = lastItem.model_output.action.find(a => a.is_done && a.is_done());
      if (doneAction) {
        return doneAction.getParams()?.success === true;
      }
    }
    return false;
  }

  is_done(): boolean {
    const lastItem = this.history[this.history.length - 1];
    return lastItem?.model_output?.action?.some(a => a.is_done && a.is_done()) || false;
  }

  final_result(): any {
    const lastItem = this.history[this.history.length - 1];
    if (lastItem?.model_output?.action) {
      const doneAction = lastItem.model_output.action.find(a => a.is_done && a.is_done());
      if (doneAction) {
        return doneAction.getParams()?.text;
      }
    }
    return null;
  }

  errors(): string[] {
    return this.history.flatMap(item => item.result.filter(r => r.error).map(r => r.error!));
  }

  urls(): string[] {
    return this.history.map(item => item.state.url).filter(Boolean);
  }

  total_input_tokens(): number {
    return this.history.reduce((sum, item) => sum + (item.metadata?.input_tokens || 0), 0);
  }

  total_duration_seconds(): number {
    return this.history.reduce((sum, item) => sum + ((item.metadata?.step_end_time || 0) - (item.metadata?.step_start_time || 0)), 0);
  }

  save_to_file(filePath: string): void {
    const dataToSave = this.history.map(item => ({
      model_output: item.model_output?.model_dump(true),
      result: item.result,
      state: item.state,
      metadata: item.metadata,
    }));
    fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2), 'utf-8');
    // logger.info(`Agent history saved to ${filePath}`); // Logger not available here
  }

  static load_from_file(filePath: string, AgentOutputClass: typeof AgentOutput): AgentHistoryList {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const historyList = new AgentHistoryList();
    historyList.history = data.map((item: any) => ({
      model_output: item.model_output ? AgentOutputClass.fromJSON(item.model_output) : null,
      result: item.result,
      state: item.state,
      metadata: item.metadata,
    }));
    return historyList;
  }
}

// --- Telemetry Types ---
export interface AgentTelemetryEventData {
  task: string;
  model: string;
  modelProvider: string;
  plannerLlm: string | null;
  maxSteps: number;
  maxActionsPerStep: number;
  useVision: boolean;
  useValidation: boolean;
  version: string;
  source: string;
  actionErrors: string[];
  actionHistory: (Record<string, any>[] | null)[];
  urlsVisited: string[];
  steps: number;
  totalInputTokens: number;
  totalDurationSeconds: number;
  success: boolean;
  finalResultResponse: string | null;
  errorMessage: string | null;
}

export class AgentTelemetryEvent {
  constructor(public data: AgentTelemetryEventData) {}
}

// --- Cloud Events (Simplified for demonstration) ---
export class CreateAgentSessionEvent {
  constructor(public data: { sessionId: string; taskId: string; task: string }) {}
  static fromAgent(agent: any): CreateAgentSessionEvent { return new CreateAgentSessionEvent({ sessionId: agent.sessionId, taskId: agent.id, task: agent.task }); }
}
export class CreateAgentTaskEvent {
  constructor(public data: { taskId: string; task: string }) {}
  static fromAgent(agent: any): CreateAgentTaskEvent { return new CreateAgentTaskEvent({ taskId: agent.id, task: agent.task }); }
}
export class UpdateAgentTaskEvent {
  constructor(public data: { taskId: string; status: string }) {}
  static fromAgent(agent: any): UpdateAgentTaskEvent { return new UpdateAgentTaskEvent({ taskId: agent.id, status: 'completed' }); }
}
export class CreateAgentStepEvent {
  constructor(public data: { taskId: string; sessionId: string; stepNumber: number; modelOutput: any; result: any; actionsData: any; browserStateSummary: any }) {}
  static fromAgentStep(agent: any, modelOutput: any, result: any, actionsData: any, browserStateSummary: any): CreateAgentStepEvent {
    return new CreateAgentStepEvent({
      taskId: agent.id,
      sessionId: agent.sessionId,
      stepNumber: agent.state.n_steps,
      modelOutput: modelOutput.model_dump ? modelOutput.model_dump(true) : modelOutput,
      result: result,
      actionsData: actionsData,
      browserStateSummary: browserStateSummary
    });
  }
}
export class CreateAgentOutputFileEvent {
  constructor(public data: { taskId: string; sessionId: string; filePath: string; fileSize: number; mimeType: string }) {}
  static async fromAgentAndFile(agent: any, filePath: string): Promise<CreateAgentOutputFileEvent> {
    const fileSize = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
    return new CreateAgentOutputFileEvent({
      taskId: agent.id,
      sessionId: agent.sessionId,
      filePath: filePath,
      fileSize: fileSize,
      mimeType: 'image/gif' // Assuming this is for GIF generation
    });
  }
}

// --- General Utilities ---
export type AgentHookFunc = (agent: any) => Promise<void> | void;