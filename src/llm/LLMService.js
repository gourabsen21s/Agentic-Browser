"use strict";
// src/llm/LLMService.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMService = void 0;
require("dotenv/config");
const messages_1 = require("@langchain/core/messages");
const logger_1 = require("../shared/logger");
const utils_1 = require("../shared/utils");
const zod_1 = require("zod");
const js_tiktoken_1 = require("js-tiktoken");
const openai_1 = require("@langchain/openai");
const logger = (0, logger_1.getLogger)('LLMService');
const SKIP_LLM_API_KEY_VERIFICATION = ((_a = process.env.SKIP_LLM_API_KEY_VERIFICATION) === null || _a === void 0 ? void 0 : _a.toLowerCase()[0]) === 't' || false;
class LLMService {
    constructor(llm) {
        var _a;
        this.toolCallingMethod = null;
        this.tokenizer = null;
        this.llm = llm;
        this.chatModelLibrary = ((_a = llm.constructor) === null || _a === void 0 ? void 0 : _a.name) || 'UnknownChatModel';
        if (this.chatModelLibrary === 'AzureChatOpenAI') {
            this.modelName = llm.azureOpenAIApiDeploymentName || llm.modelName || llm.model || 'Unknown_Azure';
        }
        else {
            this.modelName = llm.modelName || llm.model || 'Unknown';
        }
        try {
            this.tokenizer = (0, js_tiktoken_1.encodingForModel)(this.modelName);
        }
        catch (err) {
            logger.warn(`Could not find specific tokenizer for model "${this.modelName}". Falling back to 'cl100k_base' for approximate token counting. Error: ${err.message}`);
            try {
                this.tokenizer = (0, js_tiktoken_1.getEncoding)('cl100k_base');
            }
            catch (err_fallback) {
                logger.error(`Failed to initialize fallback tokenizer: ${err_fallback.message}. Token counting will be very approximate.`);
                this.tokenizer = null;
            }
        }
        logger.info(`Initialized LLMService with model: ${this.modelName}, library: ${this.chatModelLibrary}`);
    }
    countMessageTokens(messages) {
        var _a;
        if (!this.tokenizer) {
            logger.warn("Tokenizer not available, using naive token counting.");
            return messages.reduce((sum, msg) => {
                var _a;
                if (typeof msg.content === 'string') {
                    return sum + Math.ceil(msg.content.length / 4);
                }
                else if (Array.isArray(msg.content)) {
                    let partTokens = 0;
                    for (const part of msg.content) {
                        if (part.type === 'text' && part.text) {
                            partTokens += Math.ceil(part.text.length / 4);
                        }
                        else if (part.type === 'image_url' && ((_a = part.image_url) === null || _a === void 0 ? void 0 : _a.url)) {
                            partTokens += 100;
                        }
                    }
                    return sum + partTokens;
                }
                return sum;
            }, 0);
        }
        if (this.llm instanceof openai_1.ChatOpenAI || this.llm instanceof openai_1.AzureChatOpenAI) {
            if (this.llm.getNumTokensFromMessages) {
                return this.llm.getNumTokensFromMessages(messages);
            }
        }
        let totalTokens = 0;
        for (const msg of messages) {
            if (typeof msg.content === 'string') {
                totalTokens += this.tokenizer.encode(msg.content).length;
            }
            else if (Array.isArray(msg.content)) {
                for (const part of msg.content) {
                    if (part.type === 'text' && part.text) {
                        totalTokens += this.tokenizer.encode(part.text).length;
                    }
                    else if (part.type === 'image_url' && ((_a = part.image_url) === null || _a === void 0 ? void 0 : _a.url)) {
                        totalTokens += 100;
                    }
                }
            }
        }
        return totalTokens;
    }
    _getKnownToolCallingMethod() {
        const modelLower = this.modelName.toLowerCase();
        if (this.chatModelLibrary === 'ChatOpenAI') {
            if (modelLower.includes('gpt-4') || modelLower.includes('gpt-3.5')) {
                return 'function_calling';
            }
            if (modelLower.includes('deepseek') || modelLower.includes('mistral') || modelLower.includes('llama')) {
                return 'raw';
            }
        }
        else if (this.chatModelLibrary === 'AzureChatOpenAI') {
            if (modelLower.includes('gpt-4') || modelLower.includes('gpt-3.5')) {
                return 'function_calling';
            }
        }
        else if (this.chatModelLibrary === 'ChatGoogleGenerativeAI') {
            return null;
        }
        else if (this.chatModelLibrary.includes('Anthropic')) {
            if (modelLower.includes('claude-3') || modelLower.includes('claude-2')) {
                return 'tools';
            }
        }
        else if ((0, utils_1.isModelWithoutToolSupport)(this.modelName)) {
            return 'raw';
        }
        return null;
    }
    _testToolCallingMethod(method) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const CAPITAL_QUESTION = 'What is the capital of France? Respond with just the city name in lowercase.';
                const EXPECTED_ANSWER = 'paris';
                if (method === 'raw' || method === 'json_mode') {
                    const testPrompt = `${CAPITAL_QUESTION}\nRespond with a json object like: {"answer": "city_name_in_lowercase"}`;
                    const response = yield this.llm.invoke([new messages_1.HumanMessage({ content: testPrompt })]);
                    if (!response || typeof response.content !== 'string') {
                        logger.debug(`Test for method ${method} failed: empty or non-string response.`);
                        return false;
                    }
                    let content = response.content.trim();
                    if (content.startsWith('```json') && content.endsWith('```')) {
                        content = content.substring(7, content.length - 3).trim();
                    }
                    else if (content.startsWith('```') && content.endsWith('```')) {
                        content = content.substring(3, content.length - 3).trim();
                    }
                    try {
                        const result = JSON.parse(content);
                        const answer = String(result.answer || '').trim().toLowerCase().replace(/[ .]/g, '');
                        if (!answer.includes(EXPECTED_ANSWER)) {
                            logger.debug(`Test for method ${method} failed: expected '${EXPECTED_ANSWER}', got '${answer}'.`);
                            return false;
                        }
                        return true;
                    }
                    catch (e) {
                        logger.debug(`Test for method ${method} failed (JSON parse error): ${e.message}`);
                        return false;
                    }
                }
                else {
                    const testSchema = zod_1.z.object({
                        answer: zod_1.z.string(),
                    });
                    const structuredLLM = this.llm.withStructuredOutput(testSchema, {
                        includeRaw: true,
                        method,
                    });
                    const result = yield structuredLLM.invoke([new messages_1.HumanMessage({ content: CAPITAL_QUESTION })]);
                    const parsed = result.parsed;
                    if (!parsed || typeof parsed.answer !== 'string') {
                        logger.debug(`Test for method ${method} failed: LLM responded with invalid structured output.`);
                        return false;
                    }
                    return parsed.answer.toLowerCase().includes(EXPECTED_ANSWER);
                }
            }
            catch (e) {
                logger.debug(`Test for method '${method}' failed (LLM invocation error): ${e.message}`);
                return false;
            }
        });
    }
    _detectBestToolCallingMethod() {
        return __awaiter(this, void 0, void 0, function* () {
            const methodsToTry = [
                'function_calling',
                'tools',
                'json_mode',
                'raw',
            ];
            for (const method of methodsToTry) {
                const success = yield this._testToolCallingMethod(method);
                if (success) {
                    this.llm._verified_api_keys = true;
                    this.llm._verified_tool_calling_method = method;
                    logger.debug(`Detected best tool calling method: [${method}]`);
                    return method;
                }
            }
            throw new Error('Failed to connect to LLM. Please check your API key and network connection.');
        });
    }
    setToolCallingMethod(preferredMethod) {
        return __awaiter(this, void 0, void 0, function* () {
            if (preferredMethod !== 'auto') {
                if (this.llm._verified_api_keys || SKIP_LLM_API_KEY_VERIFICATION) {
                    this.llm._verified_api_keys = true;
                    this.llm._verified_tool_calling_method = preferredMethod;
                    this.toolCallingMethod = preferredMethod;
                    return preferredMethod;
                }
                const success = yield this._testToolCallingMethod(preferredMethod);
                if (!success) {
                    if (preferredMethod === 'raw') {
                        throw new Error('Failed to connect to LLM. Please check your API key and network connection.');
                    }
                    else {
                        throw new Error(`Configured tool calling method '${preferredMethod}' is not supported by the current LLM.`);
                    }
                }
                this.llm._verified_tool_calling_method = preferredMethod;
                this.toolCallingMethod = preferredMethod;
                return preferredMethod;
            }
            if (this.llm._verified_tool_calling_method !== undefined) {
                this.toolCallingMethod = this.llm._verified_tool_calling_method;
                return this.toolCallingMethod;
            }
            const knownMethod = this._getKnownToolCallingMethod();
            if (knownMethod !== null) {
                if (this.llm._verified_api_keys || SKIP_LLM_API_KEY_VERIFICATION) {
                    this.llm._verified_api_keys = true;
                    this.llm._verified_tool_calling_method = knownMethod;
                    this.toolCallingMethod = knownMethod;
                    return knownMethod;
                }
                const success = yield this._testToolCallingMethod(knownMethod);
                if (success) {
                    this.llm._verified_api_keys = true;
                    this.llm._verified_tool_calling_method = knownMethod;
                    this.toolCallingMethod = knownMethod;
                    return knownMethod;
                }
                logger.debug(`Known method ${knownMethod} failed for ${this.chatModelLibrary}/${this.modelName}, falling back to full detection.`);
            }
            const detectedMethod = yield this._detectBestToolCallingMethod();
            this.toolCallingMethod = detectedMethod;
            return detectedMethod;
        });
    }
    getNextAction(inputMessages, ActionModelClass, AgentOutputClass, toolCallingMethod, maxActionsPerStep) {
        return __awaiter(this, void 0, void 0, function* () {
            const convertedMessages = (0, utils_1.isModelWithoutToolSupport)(this.modelName)
                ? (0, utils_1.convertInputMessages)(inputMessages, this.modelName)
                : inputMessages;
            let parsedAgentOutput = null;
            let rawResponse = null;
            try {
                if (toolCallingMethod === 'raw') {
                    const output = yield this.llm.invoke(convertedMessages);
                    rawResponse = output;
                    const cleanedContent = this.removeThinkTags(String(output.content));
                    rawResponse.content = cleanedContent;
                    logger.debug(`LLM Raw Response Content (raw method): ${String(rawResponse.content).substring(0, 500)}...`);
                    if (rawResponse.tool_calls) {
                        logger.debug(`LLM Raw Tool Calls (raw method): ${JSON.stringify(rawResponse.tool_calls)}`);
                    }
                    const parsedJson = (0, utils_1.extractJsonFromModelOutput)(cleanedContent);
                    parsedAgentOutput = AgentOutputClass.fromJSON(parsedJson);
                }
                else if (toolCallingMethod === null) {
                    const structuredLLM = this.llm.withStructuredOutput(AgentOutputClass);
                    const resultFromLLM = yield structuredLLM.invoke(convertedMessages);
                    rawResponse = resultFromLLM;
                    parsedAgentOutput = AgentOutputClass.fromJSON(resultFromLLM);
                    logger.debug(`LLM Raw Response Content (native method): ${String(rawResponse.content).substring(0, 500)}...`);
                    if (rawResponse.tool_calls) {
                        logger.debug(`LLM Raw Tool Calls (native method): ${JSON.stringify(rawResponse.tool_calls)}`);
                    }
                }
                else {
                    const structuredLLM = this.llm.withStructuredOutput(AgentOutputClass, {
                        includeRaw: true,
                        method: toolCallingMethod,
                    });
                    const responseWithRaw = yield structuredLLM.invoke(convertedMessages);
                    rawResponse = responseWithRaw;
                    parsedAgentOutput = AgentOutputClass.fromJSON(responseWithRaw.parsed);
                    logger.debug(`LLM Raw Response Content (structured method): ${String(rawResponse.content).substring(0, 500)}...`);
                    if (rawResponse.tool_calls) {
                        logger.debug(`LLM Raw Tool Calls (structured method): ${JSON.stringify(rawResponse.tool_calls)}`);
                    }
                }
            }
            catch (e) {
                logger.error(`LLM invocation failed for method '${toolCallingMethod}': ${e.message}`, e);
                throw new Error(`LLM API call failed for '${toolCallingMethod}' method: ${e.message}`);
            }
            if (!parsedAgentOutput && (rawResponse === null || rawResponse === void 0 ? void 0 : rawResponse.content)) {
                try {
                    const parsedJson = (0, utils_1.extractJsonFromModelOutput)(String(rawResponse.content));
                    parsedAgentOutput = AgentOutputClass.fromJSON(parsedJson);
                }
                catch (e) {
                    logger.warn(`Failed to parse model output as fallback: ${rawResponse.content} ${e.message}`);
                    throw new Error(`Could not parse response as fallback: ${e.message}`);
                }
            }
            if (!parsedAgentOutput) {
                throw new Error('LLM did not return a parseable AgentOutput.');
            }
            if (parsedAgentOutput.action.length > maxActionsPerStep) {
                logger.warn(`Model returned ${parsedAgentOutput.action.length} actions, truncating to max ${maxActionsPerStep} allowed.`);
                parsedAgentOutput.action = parsedAgentOutput.action.slice(0, maxActionsPerStep);
            }
            return parsedAgentOutput;
        });
    }
    removeThinkTags(text) {
        const THINK_TAGS = /<think>[\s\S]*?<\/think>/g;
        const STRAY_CLOSE_TAG = /[\s\S]*?<\/think>/g;
        text = text.replace(THINK_TAGS, '');
        text = text.replace(STRAY_CLOSE_TAG, '');
        return text.trim();
    }
}
exports.LLMService = LLMService;
