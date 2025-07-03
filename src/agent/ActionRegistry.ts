// src/agent/ActionRegistry.ts

import { z } from 'zod'; // Import Zod for schema validation
import { getLogger } from '../shared/logger'; // Import your custom logger
import { ActionDefinition, ActionParameter, ActionParameterType, ActionModel, Page } from '../shared/types'; // Import types from shared

const logger = getLogger('ActionRegistry'); // Get a logger instance for this service

/**
 * Helper function to convert a custom `ActionParameter` definition into a Zod schema.
 * This allows for robust runtime validation of action parameters.
 * @param paramDef The `ActionParameter` definition.
 * @returns A Zod schema corresponding to the parameter definition.
 */
function convertToActionParameterSchema(paramDef: ActionParameter): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  switch (paramDef.type) {
    case 'string':
      schema = z.string();
      // CORRECTED: Reassign the result of the method call back to schema
      if (paramDef.pattern) schema = (schema as z.ZodString).regex(new RegExp(paramDef.pattern));
      if (paramDef.enum) schema = schema.refine(val => paramDef.enum!.includes(val), `Must be one of ${paramDef.enum.join(', ')}`);
      break;
    case 'number':
      schema = z.number();
      // CORRECTED: Reassign the result of the method call back to schema
      if (paramDef.minimum !== undefined) schema = (schema as z.ZodNumber).min(paramDef.minimum);
      if (paramDef.maximum !== undefined) schema = (schema as z.ZodNumber).max(paramDef.maximum);
      if (paramDef.enum) schema = schema.refine(val => paramDef.enum!.includes(val), `Must be one of ${paramDef.enum.join(', ')}`);
      break;
    case 'boolean':
      schema = z.boolean();
      if (paramDef.enum) schema = schema.refine(val => paramDef.enum!.includes(val), `Must be one of ${paramDef.enum.join(', ')}`);
      break;
    case 'object':
      if (paramDef.properties) {
        const shape: z.ZodRawShape = {};
        for (const key in paramDef.properties) {
          const propSchema = convertToActionParameterSchema(paramDef.properties[key]);
          shape[key] = paramDef.properties[key].required ? propSchema : propSchema.optional();
        }
        schema = z.object(shape);
      } else {
        schema = z.record(z.any());
        logger.warn(`Object parameter '${paramDef.description}' has no 'properties' defined. Validation will be loose.`);
      }
      break;
    case 'array':
      if (paramDef.items) {
        schema = z.array(convertToActionParameterSchema(paramDef.items));
      } else {
        schema = z.array(z.any());
        logger.warn(`Array parameter '${paramDef.description}' has no 'items' type defined. Validation will be loose.`);
      }
      break;
    case 'null':
      schema = z.null();
      break;
    default:
      schema = z.any();
  }

  return schema;
}

/**
 * The ActionRegistry class manages the registration, retrieval, and validation
 * of `ActionDefinition` objects. It serves as a central repository for all
 * capabilities the agent can perform.
 */
export class ActionRegistry {
  private actions: Map<string, ActionDefinition> = new Map();

  /**
   * Registers a new action definition with the registry.
   * Performs basic validation on the action structure before registration.
   * @param action The `ActionDefinition` object to register.
   * @param overwrite If `true`, allows overwriting an existing action with the same name (default: `false`).
   * @throws An `Error` if the action definition is invalid or if an action with the same name
   * already exists and `overwrite` is `false`.
   */
  register(action: ActionDefinition, overwrite: boolean = false): void {
    if (!action.name || typeof action.name !== 'string') {
      throw new Error('Action name must be a non-empty string.');
    }
    if (typeof action.execute !== 'function') {
      throw new Error('Action must have an "execute" function.');
    }
    if (this.actions.has(action.name) && !overwrite) {
      throw new Error(`Action "${action.name}" is already registered. Set 'overwrite: true' to force overwrite.`);
    }

    if (action.parameters !== undefined && typeof action.parameters !== 'object') {
      throw new Error(`Action "${action.name}" has an invalid 'parameters' definition. It must be an object.`);
    }

    for (const paramName in action.parameters) {
      const paramDef = action.parameters[paramName];
      if (!paramDef || typeof paramDef.type !== 'string' || typeof paramDef.required !== 'boolean' || typeof paramDef.description !== 'string') {
        throw new Error(`Action "${action.name}" parameter "${paramName}" has an invalid definition. Missing 'type', 'required', or 'description'.`);
      }
      try {
        convertToActionParameterSchema(paramDef);
      } catch (e: any) {
        throw new Error(`Invalid Zod-compatible schema for action "${action.name}" parameter "${paramName}": ${e.message}`);
      }
    }

    this.actions.set(action.name, action);
    logger.debug(`Action "${action.name}" registered successfully.`);
  }

  /**
   * Retrieves an action definition by its name.
   * @param name The name of the action to retrieve.
   * @returns The `ActionDefinition` object if found, otherwise `undefined`.
   */
  get(name: string): ActionDefinition | undefined {
    return this.actions.get(name);
  }

  /**
   * Checks if an action with the given name is registered in the registry.
   * @param name The name of the action to check.
   * @returns `true` if the action is registered, `false` otherwise.
   */
  has(name: string): boolean {
    return this.actions.has(name);
  }

  /**
   * Removes an action definition from the registry by its name.
   * @param name The name of the action to remove.
   * @returns `true` if the action was successfully removed, `false` if it was not found.
   */
  remove(name: string): boolean {
    const removed = this.actions.delete(name);
    if (removed) {
      logger.debug(`Action "${name}" removed successfully.`);
    } else {
      logger.warn(`Action "${name}" not found for removal.`);
    }
    return removed;
  }

  /**
   * Returns an array containing all registered action definitions.
   * Returns a shallow copy of the internal Map's values to prevent direct external modification.
   * @returns An array of `ActionDefinition` objects.
   */
  getAll(): ActionDefinition[] {
    return Array.from(this.actions.values());
  }

  /**
   * Returns an array containing the names of all registered actions.
   * @returns An array of strings, where each string is an action name.
   */
  getActionNames(): string[] {
    return Array.from(this.actions.keys());
  }

  /**
   * Validates a given set of parameters (`params`) against the defined schema
   * for a specific action.
   * @param actionName The name of the action whose parameters are to be validated.
   * @param params An object containing the parameters to validate.
   * @param deepValidate If `true`, performs deep validation for `object` and `array` types
   * based on their `properties` or `items` definitions. (Default: `false`).
   * @returns An object with a `valid` boolean (indicating success or failure) and an
   * array of `errors` (containing validation messages if `valid` is `false`).
   */
  validateParameters(actionName: string, params: Record<string, any>, deepValidate = false): { valid: boolean; errors: string[] } {
    const action = this.actions.get(actionName);
    if (!action) {
      return { valid: false, errors: [`Action "${actionName}" not found.`] };
    }

    const errors: string[] = [];
    const definedParameters = action.parameters || {};

    // Build a Zod schema for the action's parameters
    const actionSchemaShape: z.ZodRawShape = {};
    for (const [paramName, paramDef] of Object.entries(definedParameters)) {
      const paramZodSchema = convertToActionParameterSchema(paramDef);
      actionSchemaShape[paramName] = paramDef.required ? paramZodSchema : paramZodSchema.optional();
    }
    const fullActionSchema = z.object(actionSchemaShape).strict();

    try {
      if (deepValidate) {
        fullActionSchema.parse(params);
      } else {
        fullActionSchema.partial().parse(params);

        for (const [paramName, paramDef] of Object.entries(definedParameters)) {
          if (paramDef.required && !(paramName in params)) {
            errors.push(`Required parameter "${paramName}" is missing.`);
          }
        }

        for (const paramName in params) {
          if (!(paramName in definedParameters)) {
            errors.push(`Unknown parameter "${paramName}" provided for action "${actionName}".`);
          }
        }

        for (const [paramName, paramValue] of Object.entries(params)) {
          const paramDef = definedParameters[paramName];
          if (paramDef) {
            const expectedType = paramDef.type;
            const actualType = Array.isArray(paramValue) ? 'array' : (paramValue === null ? 'null' : typeof paramValue);
            if (actualType !== expectedType && !(paramDef.required === false && paramValue === undefined)) {
              errors.push(`Parameter "${paramName}" should be of type "${expectedType}", but got "${actualType}".`);
            }
          }
        }
      }
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        errors.push(...e.errors.map(err => `Validation Error for ${err.path.join('.')}: ${err.message}`));
      } else {
        errors.push(`An unexpected validation error occurred: ${e.message}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Executes a registered action after performing parameter validation.
   * @param actionName The name of the action to execute.
   * @param params An object containing the parameters to pass to the action's `execute` function.
   * @returns A Promise that resolves with the result of the action's execution.
   * @throws An `Error` if the action is not found, parameters are invalid, or the action's execution fails.
   */
  async executeAction(actionName: string, params: Record<string, any> = {}): Promise<any> {
    const action = this.actions.get(actionName);
    if (!action) {
      throw new Error(`Action "${actionName}" not found.`);
    }

    const validationResult = this.validateParameters(actionName, params, true);
    if (!validationResult.valid) {
      throw new Error(`Invalid parameters for action "${actionName}":\n${validationResult.errors.join('\n')}`);
    }

    try {
      const result = await action.execute(params);
      logger.debug(`Action "${actionName}" executed successfully.`);
      return result;
    } catch (error: any) {
      logger.error(`Error executing action "${actionName}":`, error);
      throw new Error(`Action "${actionName}" failed to execute: ${error.message || error}`);
    }
  }

  /**
   * Generates a human-readable description of available actions, including their
   * parameters and types. This format is often used to provide context to LLMs.
   * @param page Optional Playwright `Page` object to potentially filter actions
   * based on the current page context (e.g., domain-specific actions).
   * @returns A string describing the available actions.
   */
  getPromptDescription(page?: Page): string {
    const actionsToDescribe = this.getAll().filter(action => {
      return true;
    });

    if (actionsToDescribe.length === 0) {
      return 'No actions available.';
    }

    let description = 'Available actions:\n';
    for (const action of actionsToDescribe) {
      description += `- ${action.name}: ${action.description}\n`;
      if (action.parameters && Object.keys(action.parameters).length > 0) {
        description += '  Parameters:\n';
        for (const [paramName, paramDef] of Object.entries(action.parameters)) {
          const required = paramDef.required ? ' (required)' : '';
          description += `    - ${paramName} (${paramDef.type})${required}: ${paramDef.description}\n`;
        }
      }
    }
    return description;
  }

  /**
   * Creates a factory (constructor) for `ActionModel` instances.
   * This is designed to mimic Python Pydantic's dynamic model creation,
   * where a 'model' is essentially a validated structure.
   * @param options Optional settings like `includeActions` (to filter which action types this model should represent)
   * or `page` (for page-specific action models).
   * @returns A constructor function for the `ActionModel` class.
   */
  createActionModel(options?: { includeActions?: string[]; page?: Page }): typeof ActionModel {
    return ActionModel;
  }

  /**
   * Retrieves a structured list of all registered actions and their parameters.
   * This format is often useful for generating API documentation or for AI agents
   * to understand the tools they can use.
   * @returns An array of objects, each describing an action's name, description, and parameters.
   */
  getActionsSchema(): { name: string; description: string; parameters: ActionDefinition['parameters'] }[] {
    return this.getAll().map(action => ({
      name: action.name,
      description: action.description,
      parameters: action.parameters
    }));
  }

  /**
   * Finds action names that accept a specific parameter or a set of parameters,
   * based on parameter name and type. Useful for discovering capabilities.
   * @param queryParams An object where keys are parameter names and values are
   * either their expected `type` string or an object `{ type: string; value?: any }`.
   * @returns An array of names of actions that match the query criteria.
   */
  findActionByParameter(queryParams: Record<string, string | { type: string; value?: any }>): string[] {
    const matchingActions: string[] = [];
    for (const action of this.actions.values()) {
      let matches = true;
      for (const [queryParamName, queryParamValue] of Object.entries(queryParams)) {
        const paramDef = action.parameters[queryParamName];
        if (!paramDef) {
          matches = false;
          break;
        }

        let expectedType: string;
        let expectedValue: any | undefined;

        if (typeof queryParamValue === 'string') {
          expectedType = queryParamValue;
        } else {
          expectedType = queryParamValue.type;
          expectedValue = queryParamValue.value;
        }

        if (paramDef.type !== expectedType) {
          matches = false;
          break;
        }
        if (expectedValue !== undefined) {
            if (paramDef.enum && !paramDef.enum.includes(expectedValue)) {
                matches = false;
                break;
            }
        }
      }
      if (matches) {
        matchingActions.push(action.name);
      }
    }
    return matchingActions;
  }
}