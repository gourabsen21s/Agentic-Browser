// src/agent/MessageManagerService.ts

import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { getLogger } from '../shared/logger';
import { AgentOutput, AgentSettings, BrowserStateSummary, ActionResult, StepMetadata, MessageManagerSettings, MessageManagerState, ActionModel } from '../shared/types';

const logger = getLogger('MessageManagerService');

/**
 * Provides a very naive token approximation based on character count.
 * This is a placeholder; a real implementation would use a proper tokenizer (e.g., `tiktoken`).
 * Rough estimate: 1 token ~= 4 characters.
 */
function naiveTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Calculates approximate tokens for a LangChain BaseMessage.
 * This is a placeholder; a real implementation would use a proper tokenizer.
 */
function calculateMessageTokens(message: BaseMessage): number {
  if (typeof message.content === 'string') {
    return naiveTokenCount(message.content);
  } else if (Array.isArray(message.content)) {
    let totalTokens = 0;
    for (const part of message.content) {
      if (part.type === 'text' && part.text) {
        totalTokens += naiveTokenCount(part.text);
      } else if (part.type === 'image_url' && part.image_url?.url) {
        // Image token costs vary by model, this is a very rough estimate.
        // For OpenAI vision models, a low-res image is ~85 tokens, high-res is more.
        totalTokens += 100; // Placeholder for image tokens
      }
    }
    return totalTokens;
  }
  return 0;
}

/**
 * Manages the conversation history and context for the Large Language Model.
 * Responsible for adding messages, maintaining approximate token counts, and managing
 * message history size to fit within LLM input limits.
 */
export class MessageManager {
  public task: string;
  public settings: MessageManagerSettings;
  public state: MessageManagerState;

  constructor(
    task: string,
    systemMessage: BaseMessage,
    settings: MessageManagerSettings,
    initialState?: MessageManagerState
  ) {
    this.task = task;
    this.settings = settings;
    this.state = initialState || {
      history: {
        messages: [],
        current_tokens: 0,
      },
    };

    if (this.state.history.messages.length === 0) {
      this.state.history.messages.push(systemMessage);
      this.state.history.current_tokens += calculateMessageTokens(systemMessage);
    }
  }

  /**
   * Adds a new state message to the conversation history. This message typically
   * summarizes the current browser state, previous action results, and step information.
   * @param browserStateSummary A summary of the current browser state.
   * @param result Results of the previous actions.
   * @param stepInfo Metadata about the current step.
   * @param useVision Whether the agent is configured to use vision capabilities (influences screenshot inclusion).
   */
  addStateMessage(
    browserStateSummary: BrowserStateSummary,
    result: ActionResult[] | null,
    stepInfo: StepMetadata | null,
    useVision: boolean
  ): void {
    type MessageContentPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };
    const contentParts: MessageContentPart[] = [];

    contentParts.push({ type: 'text', text: `Current Task: ${this.task}` });
    contentParts.push({ type: 'text', text: `Current URL: ${browserStateSummary.url}` });
    contentParts.push({ type: 'text', text: `Page Title: ${browserStateSummary.title}` });

    const interactiveElements = Object.values(browserStateSummary.selectorMap)
      .map(el => {
        const attrs = this.settings.include_attributes
          .map(attr => {
            const value = el.attributes?.[attr];
            return value ? `${attr}="${value}"` : '';
          })
          .filter(Boolean)
          .join(' ');
        
        return `Index: ${el.highlight_index}, Tag: ${el.tagName || 'unknown'} ${attrs}`.trim();
      })
      .filter(Boolean) // Remove empty lines if attrs is empty
      .join('\n');
    
    if (interactiveElements) {
      contentParts.push({ type: 'text', text: `Interactive Elements:\n${interactiveElements}` });
    }

    if (result && result.length > 0) {
      const lastResult = result[result.length - 1];
      if (lastResult.success) {
        contentParts.push({ type: 'text', text: `Previous Action Result: Success - ${JSON.stringify(lastResult.result)}` });
      } else {
        contentParts.push({ type: 'text', text: `Previous Action Result: Failed - ${lastResult.error}` });
      }
    }

    if (stepInfo) {
      contentParts.push({ type: 'text', text: `Step: ${stepInfo.step_number} of ${stepInfo.max_steps || 'N/A'}` });
    }

    if (useVision && browserStateSummary.screenshot) {
      contentParts.push({
        type: 'image_url',
        image_url: { url: `data:image/png;base64,${browserStateSummary.screenshot}` },
      });
    }

    // IMPORTANT: Pass the contentParts array directly to the HumanMessage.
    // LangChain's vision models expect content to be an array of these specific part objects.
    this._addMessageWithTokens(new HumanMessage({ content: contentParts }));
  }

  /**
   * Adds a planning message (e.g., from a planner LLM) to the conversation history.
   * @param plan The planning text.
   * @param position The position to insert the plan message (-1 for end, 0 for beginning, etc.).
   */
  addPlan(plan: string, position: number = -1): void {
    const planMessage = new HumanMessage({ content: `Plan: ${plan}` });
    this._addMessageWithTokens(planMessage, position); // Pass position to addMessage
  }

  /**
   * Adds the LLM's raw output (e.g., the JSON action it decided to take) to the conversation history.
   * @param output The `AgentOutput` object from the LLM.
   */
  addModelOutput(output: AgentOutput): void {
    // Convert AgentOutput's action (array of ActionModel) to a plain string representation
    const actionString = JSON.stringify(output.action.map(a => a.model_dump(true)));
    this._addMessageWithTokens(new HumanMessage({ content: `Agent Action: ${actionString}` }));
  }

  /**
   * Adds a message to the history and updates the approximate token count.
   * Triggers message cutting if the token limit is exceeded.
   * @param message The `BaseMessage` to add.
   * @param position Optional position to insert the message (-1 for end, 0 for beginning).
   */
  _addMessageWithTokens(message: BaseMessage, position: number = -1): void {
    if (position === -1 || position >= this.state.history.messages.length) {
      this.state.history.messages.push(message);
    } else {
      this.state.history.messages.splice(position, 0, message);
    }
    this.state.history.current_tokens += calculateMessageTokens(message);
    
    this.cutMessages(); // Ensure message history stays within token limits
  }

  /**
   * Reduces the message history size if the current approximate token count exceeds the maximum
   * input token limit. It prioritizes keeping the initial system message and newer messages.
   */
  cutMessages(): void {
    // This implementation aims to remove oldest messages first, but keeps the
    // initial system message (index 0) and attempts to preserve recent context.
    while (this.state.history.current_tokens > this.settings.max_input_tokens && this.state.history.messages.length > 1) {
      // Remove the message at index 1 (the oldest non-system message)
      const removedMessage = this.state.history.messages.splice(1, 1)[0];
      this.state.history.current_tokens -= calculateMessageTokens(removedMessage);
      logger.debug('Message history truncated to fit token limit.');
    }
  }

  /**
   * Retrieves the current list of messages in the conversation history.
   * @returns An array of `BaseMessage` objects.
   */
  getMessages(): BaseMessage[] {
    return this.state.history.messages;
  }

  /**
   * Removes the most recently added state message from the history.
   * This is typically used if an LLM call fails, and the state message
   * should not be committed to permanent history before a retry.
   */
  _removeLastStateMessage(): void {
    // Remove the last message only if there's more than just the initial system message.
    if (this.state.history.messages.length > 1) {
      const removed = this.state.history.messages.pop();
      if (removed) {
        this.state.history.current_tokens -= calculateMessageTokens(removed);
      }
      logger.debug('Last state message removed from history.');
    }
  }

  /**
   * Adds sensitive data to the message context if the current URL matches allowed domains.
   * This is a placeholder for a security-sensitive operation.
   * @param currentUrl The current URL of the browser page.
   */
  addSensitiveData(currentUrl: string): void {
    if (this.settings.sensitive_data) {
      logger.debug(`Processing sensitive data for URL: ${currentUrl}`);
      // TODO: Implement actual logic for sensitive data injection:
      // 1. Compare `currentUrl` against domains specified in `this.settings.sensitive_data`.
      // 2. If a domain match is found, format the relevant sensitive data (e.g., credentials)
      //    into a `HumanMessage` or `SystemMessage`.
      // 3. Add this message to the conversation history using `_addMessageWithTokens`.
      //    This requires careful security consideration to avoid accidental data leakage.
    }
  }

  /**
   * Updates the current task and adds a new message to the history
   * indicating the task change.
   * @param newTask The new task description.
   */
  addNewTask(newTask: string): void {
    this.task = newTask;
    this._addMessageWithTokens(new HumanMessage({ content: `New task received: ${newTask}` }));
    logger.info(`Task updated to: "${newTask}"`);
  }
}