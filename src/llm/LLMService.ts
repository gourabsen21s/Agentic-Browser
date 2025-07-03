// src/llm/LLMService.ts

import 'dotenv/config'; 

import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseMessage, HumanMessage } from '@langchain/core/messages';
import { getLogger } from '../shared/logger';
import { ToolCallingMethod, AgentOutput, ActionModel } from '../shared/types';
import { extractJsonFromModelOutput, isModelWithoutToolSupport, convertInputMessages } from '../shared/utils';
import { z } from 'zod'; 

import { encodingForModel, getEncoding, Tiktoken } from 'js-tiktoken'; 
import { ChatOpenAI, AzureChatOpenAI } from '@langchain/openai';

const logger = getLogger('LLMService');

const SKIP_LLM_API_KEY_VERIFICATION =
  process.env.SKIP_LLM_API_KEY_VERIFICATION?.toLowerCase()[0] === 't' || false;

export class LLMService {
  public llm: BaseChatModel;
  public modelName: string;
  public chatModelLibrary: string;
  public toolCallingMethod: ToolCallingMethod | null = null;
  private tokenizer: Tiktoken | null = null;

  constructor(llm: BaseChatModel) {
    this.llm = llm;

    this.chatModelLibrary = llm.constructor?.name || 'UnknownChatModel';
    if (this.chatModelLibrary === 'AzureChatOpenAI') {
      this.modelName = (llm as any).azureOpenAIApiDeploymentName || (llm as any).modelName || (llm as any).model || 'Unknown_Azure';
    } else {
      this.modelName = (llm as any).modelName || (llm as any).model || 'Unknown';
    }

    try {
      this.tokenizer = encodingForModel(this.modelName as any);
    } catch (err: any) {
      logger.warn(`Could not find specific tokenizer for model "${this.modelName}". Falling back to 'cl100k_base' for approximate token counting. Error: ${err.message}`);
      try {
        this.tokenizer = getEncoding('cl100k_base');
      } catch (err_fallback: any) {
        logger.error(`Failed to initialize fallback tokenizer: ${err_fallback.message}. Token counting will be very approximate.`);
        this.tokenizer = null;
      }
    }

    logger.info(
      `Initialized LLMService with model: ${this.modelName}, library: ${this.chatModelLibrary}`
    );
  }

  public countMessageTokens(messages: BaseMessage[]): number {
    if (!this.tokenizer) {
        logger.warn("Tokenizer not available, using naive token counting.");
        return messages.reduce((sum, msg) => {
            if (typeof msg.content === 'string') {
                return sum + Math.ceil(msg.content.length / 4);
            } else if (Array.isArray(msg.content)) {
                let partTokens = 0;
                for (const part of msg.content) {
                    if (part.type === 'text' && part.text) {
                        partTokens += Math.ceil(part.text.length / 4);
                    } else if (part.type === 'image_url' && part.image_url?.url) {
                        partTokens += 100;
                    }
                }
                return sum + partTokens;
            }
            return sum;
        }, 0);
    }

    if (this.llm instanceof ChatOpenAI || this.llm instanceof AzureChatOpenAI) {
        if ((this.llm as any).getNumTokensFromMessages) {
            return (this.llm as any).getNumTokensFromMessages(messages);
        }
    }
    
    let totalTokens = 0;
    for (const msg of messages) {
        if (typeof msg.content === 'string') {
            totalTokens += this.tokenizer.encode(msg.content).length;
        } else if (Array.isArray(msg.content)) {
            for (const part of msg.content) {
                if (part.type === 'text' && part.text) {
                    totalTokens += this.tokenizer.encode(part.text).length;
                } else if (part.type === 'image_url' && part.image_url?.url) {
                    totalTokens += 100;
                }
            }
        }
    }
    return totalTokens;
  }

  private _getKnownToolCallingMethod(): ToolCallingMethod | null {
    const modelLower = this.modelName.toLowerCase();

    if (this.chatModelLibrary === 'ChatOpenAI') {
      if (modelLower.includes('gpt-4') || modelLower.includes('gpt-3.5')) {
        return 'function_calling';
      }
      if (modelLower.includes('deepseek') || modelLower.includes('mistral') || modelLower.includes('llama')) {
          return 'raw';
      }
    } else if (this.chatModelLibrary === 'AzureChatOpenAI') {
      if (modelLower.includes('gpt-4') || modelLower.includes('gpt-3.5')) {
        return 'function_calling';
      }
    } else if (this.chatModelLibrary === 'ChatGoogleGenerativeAI') {
      return null;
    } else if (this.chatModelLibrary.includes('Anthropic')) {
      if (modelLower.includes('claude-3') || modelLower.includes('claude-2')) {
        return 'tools';
      }
    } else if (isModelWithoutToolSupport(this.modelName)) {
      return 'raw';
    }

    return null;
  }

  private async _testToolCallingMethod(method: ToolCallingMethod): Promise<boolean> {
    try {
      const CAPITAL_QUESTION =
        'What is the capital of France? Respond with just the city name in lowercase.';
      const EXPECTED_ANSWER = 'paris';

      if (method === 'raw' || method === 'json_mode') {
        const testPrompt = `${CAPITAL_QUESTION}\nRespond with a json object like: {"answer": "city_name_in_lowercase"}`;
        const response = await this.llm.invoke([new HumanMessage({ content: testPrompt })]);
        if (!response || typeof response.content !== 'string') {
            logger.debug(`Test for method ${method} failed: empty or non-string response.`);
            return false;
        }

        let content = response.content.trim();
        if (content.startsWith('```json') && content.endsWith('```')) {
          content = content.substring(7, content.length - 3).trim();
        } else if (content.startsWith('```') && content.endsWith('```')) {
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
        } catch (e: any) {
          logger.debug(`Test for method ${method} failed (JSON parse error): ${e.message}`);
          return false;
        }
      } else {
        const testSchema = z.object({
          answer: z.string(),
        });

        const structuredLLM = this.llm.withStructuredOutput(testSchema as any, {
          includeRaw: true,
          method,
        });

        const result = await structuredLLM.invoke([new HumanMessage({ content: CAPITAL_QUESTION })]);
        const parsed = (result as any).parsed;
        if (!parsed || typeof parsed.answer !== 'string') {
            logger.debug(`Test for method ${method} failed: LLM responded with invalid structured output.`);
            return false;
        }
        return parsed.answer.toLowerCase().includes(EXPECTED_ANSWER);
      }
    } catch (e: any) {
      logger.debug(`Test for method '${method}' failed (LLM invocation error): ${e.message}`);
      return false;
    }
  }

  private async _detectBestToolCallingMethod(): Promise<ToolCallingMethod | null> {
    const methodsToTry: ToolCallingMethod[] = [
      'function_calling',
      'tools',
      'json_mode',
      'raw',
    ];

    for (const method of methodsToTry) {
      const success = await this._testToolCallingMethod(method);
      if (success) {
        this.llm._verified_api_keys = true;
        this.llm._verified_tool_calling_method = method;
        logger.debug(`Detected best tool calling method: [${method}]`);
        return method;
      }
    }

    throw new Error('Failed to connect to LLM. Please check your API key and network connection.');
  }

  async setToolCallingMethod(preferredMethod: ToolCallingMethod): Promise<ToolCallingMethod | null> {
    if (preferredMethod !== 'auto') {
      if (this.llm._verified_api_keys || SKIP_LLM_API_KEY_VERIFICATION) {
        this.llm._verified_api_keys = true;
        this.llm._verified_tool_calling_method = preferredMethod;
        this.toolCallingMethod = preferredMethod;
        return preferredMethod;
      }

      const success = await this._testToolCallingMethod(preferredMethod);
      if (!success) {
        if (preferredMethod === 'raw') {
          throw new Error('Failed to connect to LLM. Please check your API key and network connection.');
        } else {
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

      const success = await this._testToolCallingMethod(knownMethod);
      if (success) {
        this.llm._verified_api_keys = true;
        this.llm._verified_tool_calling_method = knownMethod;
        this.toolCallingMethod = knownMethod;
        return knownMethod;
      }
      logger.debug(`Known method ${knownMethod} failed for ${this.chatModelLibrary}/${this.modelName}, falling back to full detection.`);
    }

    const detectedMethod = await this._detectBestToolCallingMethod();
    this.toolCallingMethod = detectedMethod;
    return detectedMethod;
  }

  async getNextAction(
    inputMessages: BaseMessage[],
    ActionModelClass: typeof ActionModel,
    AgentOutputClass: typeof AgentOutput,
    toolCallingMethod: ToolCallingMethod | null,
    maxActionsPerStep: number
  ): Promise<AgentOutput> {
    const convertedMessages = isModelWithoutToolSupport(this.modelName)
      ? convertInputMessages(inputMessages, this.modelName)
      : inputMessages;

    let parsedAgentOutput: AgentOutput | null = null;
    let rawResponse: any = null;

    try {
      if (toolCallingMethod === 'raw') {
        const output = await this.llm.invoke(convertedMessages);
        rawResponse = output;
        const cleanedContent = this.removeThinkTags(String(output.content));
        rawResponse.content = cleanedContent;

        logger.debug(`LLM Raw Response Content (raw method): ${String(rawResponse.content).substring(0, 500)}...`);
        if (rawResponse.tool_calls) {
            logger.debug(`LLM Raw Tool Calls (raw method): ${JSON.stringify(rawResponse.tool_calls)}`);
        }

        const parsedJson = extractJsonFromModelOutput(cleanedContent);
        parsedAgentOutput = AgentOutputClass.fromJSON(parsedJson);
      } else if (toolCallingMethod === null) {
        const structuredLLM = this.llm.withStructuredOutput(AgentOutputClass);
        const resultFromLLM = await structuredLLM.invoke(convertedMessages);
        rawResponse = resultFromLLM;
        parsedAgentOutput = AgentOutputClass.fromJSON(resultFromLLM);
        
        logger.debug(`LLM Raw Response Content (native method): ${String(rawResponse.content).substring(0, 500)}...`);
        if (rawResponse.tool_calls) {
            logger.debug(`LLM Raw Tool Calls (native method): ${JSON.stringify(rawResponse.tool_calls)}`);
        }

      } else {
        const structuredLLM = this.llm.withStructuredOutput(AgentOutputClass, {
          includeRaw: true,
          method: toolCallingMethod,
        });
        const responseWithRaw = await structuredLLM.invoke(convertedMessages);
        rawResponse = responseWithRaw;
        parsedAgentOutput = AgentOutputClass.fromJSON((responseWithRaw as any).parsed);
        
        logger.debug(`LLM Raw Response Content (structured method): ${String(rawResponse.content).substring(0, 500)}...`);
        if (rawResponse.tool_calls) {
            logger.debug(`LLM Raw Tool Calls (structured method): ${JSON.stringify(rawResponse.tool_calls)}`);
        }
      }
    } catch (e: any) {
      logger.error(`LLM invocation failed for method '${toolCallingMethod}': ${e.message}`, e);
      throw new Error(`LLM API call failed for '${toolCallingMethod}' method: ${e.message}`);
    }

    if (!parsedAgentOutput && rawResponse?.content) {
      try {
        const parsedJson = extractJsonFromModelOutput(String(rawResponse.content));
        parsedAgentOutput = AgentOutputClass.fromJSON(parsedJson);
      } catch (e: any) {
        logger.warn(`Failed to parse model output as fallback: ${rawResponse.content} ${e.message}`);
        throw new Error(`Could not parse response as fallback: ${e.message}`);
      }
    }

    if (!parsedAgentOutput) {
      throw new Error('LLM did not return a parseable AgentOutput.');
    }

    if (parsedAgentOutput.action.length > maxActionsPerStep) {
      logger.warn(
        `Model returned ${parsedAgentOutput.action.length} actions, truncating to max ${maxActionsPerStep} allowed.`
      );
      parsedAgentOutput.action = parsedAgentOutput.action.slice(0, maxActionsPerStep);
    }

    return parsedAgentOutput;
  }

  removeThinkTags(text: string): string {
    const THINK_TAGS = /<think>[\s\S]*?<\/think>/g;
    const STRAY_CLOSE_TAG = /[\s\S]*?<\/think>/g;

    text = text.replace(THINK_TAGS, '');
    text = text.replace(STRAY_CLOSE_TAG, '');
    return text.trim();
  }
}