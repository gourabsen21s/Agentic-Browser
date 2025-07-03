"use strict";
// src/shared/utils.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.timeExecutionAsync = timeExecutionAsync;
exports.timeExecutionSync = timeExecutionSync;
exports.getBrowserUseVersion = getBrowserUseVersion;
exports._logPrettyPath = _logPrettyPath;
exports.extractJsonFromModelOutput = extractJsonFromModelOutput;
exports.isModelWithoutToolSupport = isModelWithoutToolSupport;
exports.convertInputMessages = convertInputMessages;
exports.saveConversation = saveConversation;
const logger_1 = require("./logger");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const messages_1 = require("@langchain/core/messages");
const logger = (0, logger_1.getLogger)('Utils');
// --- Timing Decorators ---
function timeExecutionAsync(name = 'Execution') {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = function (...args) {
            return __awaiter(this, void 0, void 0, function* () {
                const startTime = Date.now();
                try {
                    const result = yield originalMethod.apply(this, args);
                    const duration = Date.now() - startTime;
                    logger.debug(`${name} '${String(propertyKey)}' completed in ${duration}ms`);
                    return result;
                }
                catch (error) {
                    const duration = Date.now() - startTime;
                    logger.error(`${name} '${String(propertyKey)}' failed in ${duration}ms: ${error}`);
                    throw error;
                }
            });
        };
        return descriptor;
    };
}
function timeExecutionSync(name = 'Execution') {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = function (...args) {
            const startTime = Date.now();
            try {
                const result = originalMethod.apply(this, args);
                const duration = Date.now() - startTime;
                logger.debug(`${name} '${String(propertyKey)}' completed in ${duration}ms`);
                return result;
            }
            catch (error) {
                const duration = Date.now() - startTime;
                logger.error(`${name} '${String(propertyKey)}' failed in ${duration}ms: ${error}`);
                throw error;
            }
        };
        return descriptor;
    };
}
// --- Version Retrieval ---
function getBrowserUseVersion() {
    try {
        const packageJsonPath = path.resolve(__dirname, '../../package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        return packageJson.version || 'unknown';
    }
    catch (error) {
        logger.warn(`Could not determine package version: ${error}`);
        return 'unknown';
    }
}
// --- Path Pretty Logging ---
function _logPrettyPath(filePath) {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (homeDir && filePath.startsWith(homeDir)) {
        return `~${filePath.substring(homeDir.length)}`;
    }
    return filePath;
}
// --- LLM Message Processing Utilities ---
function extractJsonFromModelOutput(content) {
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
        try {
            return JSON.parse(jsonMatch[1]);
        }
        catch (e) {
            logger.error(`Failed to parse JSON from markdown block: ${e}`);
            throw new Error(`Failed to parse JSON from markdown block: ${e}`);
        }
    }
    try {
        return JSON.parse(content);
    }
    catch (e) {
        logger.error(`No valid JSON found or could not parse raw content: ${e}`);
        throw new Error(`No valid JSON found or could not parse: ${content}`);
    }
}
function isModelWithoutToolSupport(modelName) {
    const noToolModels = ['llama', 'mistral', 'gemma', 'deepseek'];
    return noToolModels.some(m => modelName.toLowerCase().includes(m));
}
function convertInputMessages(messages, modelName) {
    return messages.map(msg => {
        if (msg._getType && msg._getType() === 'tool_message') {
            return new messages_1.HumanMessage({ content: `Tool output: ${JSON.stringify(msg.content)}` });
        }
        return msg;
    });
}
function saveConversation(inputMessages, modelOutput, targetPath, encoding) {
    return __awaiter(this, void 0, void 0, function* () {
        const content = `--- Input Messages ---\n${inputMessages.map(msg => JSON.stringify(msg, null, 2)).join('\n')}\n` +
            `--- Model Output ---\n${JSON.stringify(modelOutput.model_dump ? modelOutput.model_dump(true) : modelOutput, null, 2)}\n`;
        // CORRECTED LINE: Explicitly cast the encoding string
        fs.writeFileSync(targetPath, content, { encoding: (encoding || 'utf-8') });
    });
}
