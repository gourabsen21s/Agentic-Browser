export interface ActionParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';
  required: boolean;
  description: string;
  properties?: { [key: string]: ActionParameter };
  items?: ActionParameter;
  pattern?: string;
  enum?: (string | number | boolean)[];
  minimum?: number;
  maximum?: number;
}

export interface ActionDefinition {
  name: string;
  description: string;
  parameters: {
    [key: string]: ActionParameter;
  };
  execute: (params: Record<string, any>) => Promise<any>; 
}

export class ActionRegistry {
  private actions: Map<string, ActionDefinition> = new Map();

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
      if (paramDef.type === 'object' && !paramDef.properties) {
        console.warn(`Action "${action.name}" parameter "${paramName}" is type 'object' but has no 'properties' defined for deep validation.`);
      }
      if (paramDef.type === 'array' && !paramDef.items) {
        console.warn(`Action "${action.name}" parameter "${paramName}" is type 'array' but has no 'items' type defined for deep validation.`);
      }
    }

    this.actions.set(action.name, action);
    console.log(`Action "${action.name}" registered successfully.`);
  }

  get(name: string): ActionDefinition | undefined {
    return this.actions.get(name);
  }

  has(name: string): boolean {
    return this.actions.has(name);
  }

  remove(name: string): boolean {
    const removed = this.actions.delete(name);
    if (removed) {
      console.log(`Action "${name}" removed successfully.`);
    } else {
      console.warn(`Action "${name}" not found for removal.`);
    }
    return removed;
  }

  getAll(): ActionDefinition[] {
    return Array.from(this.actions.values());
  }

  getActionNames(): string[] {
    return Array.from(this.actions.keys());
  }

  validateParameters(actionName: string, params: Record<string, any>, deepValidate = false): { valid: boolean; errors: string[] } {
    const action = this.actions.get(actionName);
    if (!action) {
      return { valid: false, errors: [`Action "${actionName}" not found.`] };
    }

    const errors: string[] = [];
    const definedParameters = action.parameters || {};

    for (const [paramName, paramDef] of Object.entries(definedParameters)) {
      if (paramDef.required && !(paramName in params)) {
        errors.push(`Required parameter "${paramName}" is missing.`);
      }
    }

    for (const [paramName, paramValue] of Object.entries(params)) {
      const paramDef = definedParameters[paramName];
      if (paramDef) {
        const expectedType = paramDef.type;
        const actualType = paramValue === null ? 'null' : Array.isArray(paramValue) ? 'array' : typeof paramValue;

        if (actualType !== expectedType) {
          errors.push(`Parameter "${paramName}" should be of type "${expectedType}", but got "${actualType}".`);
          continue; 
        }

        if (deepValidate) {
          if (expectedType === 'object' && paramDef.properties) {
            const nestedValidation = this.validateObjectParameters(paramDef.properties, paramValue, `${actionName}.${paramName}`);
            errors.push(...nestedValidation);
          } else if (expectedType === 'array' && paramDef.items && Array.isArray(paramValue)) {
            const nestedValidation = this.validateArrayItems(paramDef.items, paramValue, `${actionName}.${paramName}`);
            errors.push(...nestedValidation);
          }
        }

        if (paramDef.pattern && typeof paramValue === 'string' && !new RegExp(paramDef.pattern).test(paramValue)) {
          errors.push(`Parameter "${paramName}" does not match the required pattern.`);
        }
        if (paramDef.enum && !paramDef.enum.includes(paramValue)) {
          errors.push(`Parameter "${paramName}" has an invalid value. Allowed values are: ${paramDef.enum.join(', ')}.`);
        }
        if (paramDef.minimum !== undefined && typeof paramValue === 'number' && paramValue < paramDef.minimum) {
          errors.push(`Parameter "${paramName}" must be at least ${paramDef.minimum}.`);
        }
        if (paramDef.maximum !== undefined && typeof paramValue === 'number' && paramValue > paramDef.maximum) {
          errors.push(`Parameter "${paramName}" must be at most ${paramDef.maximum}.`);
        }

      } else {
        errors.push(`Unknown parameter "${paramName}" provided for action "${actionName}".`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private validateObjectParameters(
    paramProperties: { [key: string]: ActionParameter },
    obj: Record<string, any>,
    path: string
  ): string[] {
    const errors: string[] = [];
    for (const [propName, propDef] of Object.entries(paramProperties)) {
      const fullPath = `${path}.${propName}`;
      if (propDef.required && !(propName in obj)) {
        errors.push(`Required parameter "${fullPath}" is missing.`);
      }
      if (propName in obj) {
        const actualType = obj[propName] === null ? 'null' : Array.isArray(obj[propName]) ? 'array' : typeof obj[propName];
        if (actualType !== propDef.type) {
          errors.push(`Parameter "${fullPath}" should be of type "${propDef.type}", but got "${actualType}".`);
        }
        if (propDef.type === 'object' && propDef.properties && typeof obj[propName] === 'object' && obj[propName] !== null) {
          errors.push(...this.validateObjectParameters(propDef.properties, obj[propName], fullPath));
        } else if (propDef.type === 'array' && propDef.items && Array.isArray(obj[propName])) {
          errors.push(...this.validateArrayItems(propDef.items, obj[propName], fullPath));
        }
      }
    }
    return errors;
  }

  private validateArrayItems(
    itemDef: ActionParameter,
    arr: any[],
    path: string
  ): string[] {
    const errors: string[] = [];
    arr.forEach((item, index) => {
      const fullPath = `${path}[${index}]`;
      const actualType = item === null ? 'null' : Array.isArray(item) ? 'array' : typeof item;
      if (actualType !== itemDef.type) {
        errors.push(`Array item "${fullPath}" should be of type "${itemDef.type}", but got "${actualType}".`);
      }
      if (itemDef.type === 'object' && itemDef.properties && typeof item === 'object' && item !== null) {
        errors.push(...this.validateObjectParameters(itemDef.properties, item, fullPath));
      } else if (itemDef.type === 'array' && itemDef.items && Array.isArray(item)) {
        errors.push(...this.validateArrayItems(itemDef.items, item, fullPath));
      }
    });
    return errors;
  }

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
      console.log(`Action "${actionName}" executed successfully.`);
      return result;
    } catch (error: any) {
      console.error(`Error executing action "${actionName}":`, error);
      throw new Error(`Action "${actionName}" failed to execute: ${error.message || error}`);
    }
  }

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
        if (expectedValue !== undefined && (paramDef.enum ? !paramDef.enum.includes(expectedValue) : true)) {
          // If expectedValue is provided, and it's not in enum (if defined)
          // or if enum isn't defined, we can't fully match by value here without more context.
          // This is a simplified check.
          // For exact value matching for non-enum types, deeper logic would be needed.
        }
      }
      if (matches) {
        matchingActions.push(action.name);
      }
    }
    return matchingActions;
  }

  getActionsSchema(): { name: string; description: string; parameters: ActionDefinition['parameters'] }[] {
    return this.getAll().map(action => ({
      name: action.name,
      description: action.description,
      parameters: action.parameters
    }));
  }
}