"use strict";
// src/shared/types.ts
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
exports.CreateAgentOutputFileEvent = exports.CreateAgentStepEvent = exports.UpdateAgentTaskEvent = exports.CreateAgentTaskEvent = exports.CreateAgentSessionEvent = exports.AgentTelemetryEvent = exports.AgentHistoryList = exports.AgentOutput = exports.ActionModel = void 0;
const fs = __importStar(require("fs")); // Required for CreateAgentOutputFileEvent
// Action Model (dynamic structure representing the LLM's chosen action)
class ActionModel {
    constructor(data) {
        if (Object.keys(data).length !== 1) {
            throw new Error("ActionModel expects exactly one action key-value pair at construction.");
        }
        this._actionData = data;
        Object.assign(this, data); // Assign dynamic property directly for easier access
    }
    // --- Fixed Methods for ActionModel Instances ---
    get_index() {
        const actionParams = this.getParams();
        return (actionParams && typeof actionParams.index === 'number') ? actionParams.index : null;
    }
    set_index(newIndex) {
        const actionParams = this.getParams();
        if (actionParams && typeof actionParams === 'object') {
            actionParams.index = newIndex;
        }
    }
    is_done() {
        return Object.keys(this._actionData)[0] === 'done';
    }
    model_dump(exclude_unset = false) {
        const dumped = {};
        const actionName = Object.keys(this._actionData)[0];
        const actionParams = this._actionData[actionName];
        if (actionParams && typeof actionParams === 'object') {
            const copiedParams = {};
            for (const key in actionParams) {
                if (Object.prototype.hasOwnProperty.call(actionParams, key)) {
                    if (exclude_unset && actionParams[key] === undefined) {
                        continue;
                    }
                    copiedParams[key] = actionParams[key];
                }
            }
            dumped[actionName] = copiedParams;
        }
        else {
            dumped[actionName] = actionParams;
        }
        return dumped;
    }
    getParams() {
        const actionName = Object.keys(this._actionData)[0];
        return this._actionData[actionName];
    }
    getActionName() {
        return Object.keys(this._actionData)[0];
    }
}
exports.ActionModel = ActionModel;
// Output structure received from the LLM after processing messages
class AgentOutput {
    constructor(data) {
        this.current_state = data.current_state;
        this.action = data.action;
    }
    // Static method to create AgentOutput from a plain JSON object (for loading history)
    static fromJSON(json) {
        var _a, _b, _c, _d;
        const current_state = {
            page_summary: ((_a = json.current_state) === null || _a === void 0 ? void 0 : _a.page_summary) || '',
            evaluation_previous_goal: ((_b = json.current_state) === null || _b === void 0 ? void 0 : _b.evaluation_previous_goal) || '',
            memory: ((_c = json.current_state) === null || _c === void 0 ? void 0 : _c.memory) || '',
            next_goal: ((_d = json.current_state) === null || _d === void 0 ? void 0 : _d.next_goal) || '',
        };
        const actions = (json.action || []).map((a) => new ActionModel(a));
        return new AgentOutput({ current_state, action: actions });
    }
    // This factory method simulates Python's dynamic Pydantic model creation
    static typeWithCustomActions(ActionModelClass) {
        return AgentOutput;
    }
    // Converts the AgentOutput instance to a plain JavaScript object for serialization
    model_dump(exclude_unset = false) {
        const dumped = {
            current_state: this.current_state,
            action: this.action.map(a => a.model_dump(exclude_unset))
        };
        return dumped;
    }
}
exports.AgentOutput = AgentOutput;
// The complete history of an agent's run
class AgentHistoryList {
    constructor() {
        this.history = [];
    }
    is_successful() {
        var _a, _b;
        const lastItem = this.history[this.history.length - 1];
        if ((_a = lastItem === null || lastItem === void 0 ? void 0 : lastItem.model_output) === null || _a === void 0 ? void 0 : _a.action) {
            const doneAction = lastItem.model_output.action.find(a => a.is_done && a.is_done());
            if (doneAction) {
                return ((_b = doneAction.getParams()) === null || _b === void 0 ? void 0 : _b.success) === true;
            }
        }
        return false;
    }
    is_done() {
        var _a, _b;
        const lastItem = this.history[this.history.length - 1];
        return ((_b = (_a = lastItem === null || lastItem === void 0 ? void 0 : lastItem.model_output) === null || _a === void 0 ? void 0 : _a.action) === null || _b === void 0 ? void 0 : _b.some(a => a.is_done && a.is_done())) || false;
    }
    final_result() {
        var _a, _b;
        const lastItem = this.history[this.history.length - 1];
        if ((_a = lastItem === null || lastItem === void 0 ? void 0 : lastItem.model_output) === null || _a === void 0 ? void 0 : _a.action) {
            const doneAction = lastItem.model_output.action.find(a => a.is_done && a.is_done());
            if (doneAction) {
                return (_b = doneAction.getParams()) === null || _b === void 0 ? void 0 : _b.text;
            }
        }
        return null;
    }
    errors() {
        return this.history.flatMap(item => item.result.filter(r => r.error).map(r => r.error));
    }
    urls() {
        return this.history.map(item => item.state.url).filter(Boolean);
    }
    total_input_tokens() {
        return this.history.reduce((sum, item) => { var _a; return sum + (((_a = item.metadata) === null || _a === void 0 ? void 0 : _a.input_tokens) || 0); }, 0);
    }
    total_duration_seconds() {
        return this.history.reduce((sum, item) => { var _a, _b; return sum + ((((_a = item.metadata) === null || _a === void 0 ? void 0 : _a.step_end_time) || 0) - (((_b = item.metadata) === null || _b === void 0 ? void 0 : _b.step_start_time) || 0)); }, 0);
    }
    save_to_file(filePath) {
        const dataToSave = this.history.map(item => {
            var _a;
            return ({
                model_output: (_a = item.model_output) === null || _a === void 0 ? void 0 : _a.model_dump(true),
                result: item.result,
                state: item.state,
                metadata: item.metadata,
            });
        });
        fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2), 'utf-8');
        // logger.info(`Agent history saved to ${filePath}`); // Logger not available here
    }
    static load_from_file(filePath, AgentOutputClass) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const historyList = new AgentHistoryList();
        historyList.history = data.map((item) => ({
            model_output: item.model_output ? AgentOutputClass.fromJSON(item.model_output) : null,
            result: item.result,
            state: item.state,
            metadata: item.metadata,
        }));
        return historyList;
    }
}
exports.AgentHistoryList = AgentHistoryList;
class AgentTelemetryEvent {
    constructor(data) {
        this.data = data;
    }
}
exports.AgentTelemetryEvent = AgentTelemetryEvent;
// --- Cloud Events (Simplified for demonstration) ---
class CreateAgentSessionEvent {
    constructor(data) {
        this.data = data;
    }
    static fromAgent(agent) { return new CreateAgentSessionEvent({ sessionId: agent.sessionId, taskId: agent.id, task: agent.task }); }
}
exports.CreateAgentSessionEvent = CreateAgentSessionEvent;
class CreateAgentTaskEvent {
    constructor(data) {
        this.data = data;
    }
    static fromAgent(agent) { return new CreateAgentTaskEvent({ taskId: agent.id, task: agent.task }); }
}
exports.CreateAgentTaskEvent = CreateAgentTaskEvent;
class UpdateAgentTaskEvent {
    constructor(data) {
        this.data = data;
    }
    static fromAgent(agent) { return new UpdateAgentTaskEvent({ taskId: agent.id, status: 'completed' }); }
}
exports.UpdateAgentTaskEvent = UpdateAgentTaskEvent;
class CreateAgentStepEvent {
    constructor(data) {
        this.data = data;
    }
    static fromAgentStep(agent, modelOutput, result, actionsData, browserStateSummary) {
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
exports.CreateAgentStepEvent = CreateAgentStepEvent;
class CreateAgentOutputFileEvent {
    constructor(data) {
        this.data = data;
    }
    static fromAgentAndFile(agent, filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            const fileSize = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
            return new CreateAgentOutputFileEvent({
                taskId: agent.id,
                sessionId: agent.sessionId,
                filePath: filePath,
                fileSize: fileSize,
                mimeType: 'image/gif' // Assuming this is for GIF generation
            });
        });
    }
}
exports.CreateAgentOutputFileEvent = CreateAgentOutputFileEvent;
