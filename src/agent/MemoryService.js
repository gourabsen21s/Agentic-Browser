"use strict";
// src/agent/MemoryService.ts
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
exports.Memory = void 0;
const messages_1 = require("@langchain/core/messages"); // Import necessary message types
const logger_1 = require("../shared/logger"); // Import your custom logger
const logger = (0, logger_1.getLogger)('MemoryService'); // Get a logger instance for this service
/**
 * Manages the agent's long-term and procedural memory.
 * This typically involves summarizing past interactions or observations
 * to provide a condensed context to the LLM over time.
 */
class Memory {
    /**
     * Constructs a new Memory service instance.
     * @param messageManager An instance of `MessageManager` to interact with conversation history.
     * @param llm The `BaseChatModel` instance to use for memory creation (e.g., summarizing).
     * @param config Optional `MemoryConfig` to customize memory behavior; defaults to interval of 5 steps.
     */
    constructor(messageManager, llm, config) {
        this.messageManager = messageManager;
        this.llm = llm;
        this.config = config || { memory_interval: 5 }; // Default memory creation every 5 steps
        // In a production setup, you might check for specific dependencies here if
        // advanced memory features (like vector stores) require optional packages.
        // Example:
        // try {
        //   // require('some-vector-db-client');
        // } catch (e) {
        //   logger.warn('Vector DB client not found. Advanced memory features might be limited.');
        // }
    }
    /**
     * Creates a "procedural memory" entry based on recent interactions.
     * This involves asking the LLM to summarize or analyze recent conversation
     * history and observations. The generated memory is then added back into
     * the conversation history (e.g., as a system message).
     * @param nSteps The current step number, used to decide when to create memory based on `memory_interval`.
     */
    createProceduralMemory(nSteps) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if it's time to create procedural memory based on the configured interval
            if (nSteps === 0 || nSteps % this.config.memory_interval !== 0) {
                return; // Not the right interval for memory creation
            }
            logger.info(`Creating procedural memory at step ${nSteps}...`);
            try {
                // Get a window of recent messages for the LLM to summarize.
                // This is a simplified approach; a more advanced system might selectively
                // choose important messages or use a different history subset.
                const recentMessages = this.messageManager.getMessages().slice(-this.config.memory_interval * 2); // Get roughly last 2 intervals worth of messages
                if (recentMessages.length === 0) {
                    logger.debug('No recent messages to create procedural memory from.');
                    return;
                }
                // Construct a prompt for the LLM to create procedural memory.
                // The LLM summarizes past actions/observations into actionable insights.
                const memoryPromptMessages = [
                    new messages_1.SystemMessage({ content: `You are an agent's memory component. Summarize the following recent conversation history and agent observations into a concise, actionable procedural memory statement. Focus on lessons learned, recurring patterns, or persistent states. This memory will inform future steps. Your response should be brief and to the point. Example: "Previously, clicking 'Next' led to a popup."` }),
                    ...recentMessages, // Include recent conversation for context
                    new messages_1.HumanMessage({ content: "Based on the above, provide a concise procedural memory statement for the agent's future steps:" })
                ];
                // Invoke the LLM to generate the procedural memory
                const response = yield this.llm.invoke(memoryPromptMessages);
                const memoryStatement = String(response.content || '').trim();
                if (memoryStatement) {
                    // Add the generated memory statement back into the conversation history.
                    // It's often added as a SystemMessage to distinguish it from direct user/LLM turns.
                    this.messageManager._addMessageWithTokens(new messages_1.SystemMessage({ content: `Procedural Memory: ${memoryStatement}` }));
                    logger.info(`Procedural memory created: "${memoryStatement.substring(0, 100)}..."`);
                }
                else {
                    logger.warn('LLM returned an empty memory statement.');
                }
            }
            catch (error) {
                logger.error(`Failed to create procedural memory: ${error.message}`, error);
                // Decide if memory creation failures should stop the agent or be retried.
            }
        });
    }
}
exports.Memory = Memory;
