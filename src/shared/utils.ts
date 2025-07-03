// src/shared/utils.ts

import { getLogger } from './logger';
import * as path from 'path';
import * as fs from 'fs';
import { BaseMessage, HumanMessage } from '@langchain/core/messages';
import { ActionModel, AgentOutput } from './types';

const logger = getLogger('Utils');

// --- Timing Decorators ---
export function timeExecutionAsync(name: string = 'Execution'): MethodDecorator {
  return function (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        logger.debug(`${name} '${String(propertyKey)}' completed in ${duration}ms`);
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`${name} '${String(propertyKey)}' failed in ${duration}ms: ${error}`);
        throw error;
      }
    };
    return descriptor;
  };
}

export function timeExecutionSync(name: string = 'Execution'): MethodDecorator {
  return function (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const startTime = Date.now();
      try {
        const result = originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        logger.debug(`${name} '${String(propertyKey)}' completed in ${duration}ms`);
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`${name} '${String(propertyKey)}' failed in ${duration}ms: ${error}`);
        throw error;
      }
    };
    return descriptor;
  };
}

// --- Version Retrieval ---
export function getBrowserUseVersion(): string {
  try {
    const packageJsonPath = path.resolve(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version || 'unknown';
  } catch (error) {
    logger.warn(`Could not determine package version: ${error}`);
    return 'unknown';
  }
}

// --- Path Pretty Logging ---
export function _logPrettyPath(filePath: string): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (homeDir && filePath.startsWith(homeDir)) {
    return `~${filePath.substring(homeDir.length)}`;
  }
  return filePath;
}

// --- LLM Message Processing Utilities ---
export function extractJsonFromModelOutput(content: string): Record<string, any> {
  const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch (e) {
      logger.error(`Failed to parse JSON from markdown block: ${e}`);
      throw new Error(`Failed to parse JSON from markdown block: ${e}`);
    }
  }

  try {
    return JSON.parse(content);
  } catch (e) {
    logger.error(`No valid JSON found or could not parse raw content: ${e}`);
    throw new Error(`No valid JSON found or could not parse: ${content}`);
  }
}

export function isModelWithoutToolSupport(modelName: string): boolean {
  const noToolModels = ['llama', 'mistral', 'gemma', 'deepseek'];
  return noToolModels.some(m => modelName.toLowerCase().includes(m));
}

export function convertInputMessages(messages: BaseMessage[], modelName: string): BaseMessage[] {
  return messages.map(msg => {
    if ((msg as any)._getType && (msg as any)._getType() === 'tool_message') {
      return new HumanMessage({ content: `Tool output: ${JSON.stringify(msg.content)}` });
    }
    return msg;
  });
}

export async function saveConversation(inputMessages: BaseMessage[], modelOutput: AgentOutput, targetPath: string, encoding: string | null): Promise<void> {
  const content = `--- Input Messages ---\n${inputMessages.map(msg => JSON.stringify(msg, null, 2)).join('\n')}\n` +
                  `--- Model Output ---\n${JSON.stringify(modelOutput.model_dump ? modelOutput.model_dump(true) : modelOutput, null, 2)}\n`;
  // CORRECTED LINE: Explicitly cast the encoding string
  fs.writeFileSync(targetPath, content, { encoding: (encoding || 'utf-8') as BufferEncoding });
}