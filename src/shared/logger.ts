// src/shared/logger.ts

import winston from 'winston';
import { AppLogger } from './types'; // Import the AppLogger interface from your shared types

// Configure the main Winston logger instance
const logger = winston.createLogger({
  // Set the logging level based on the environment variable, defaulting to 'debug' for development.
  // 'info' level is suitable for production, 'debug' for detailed development logs.
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  
  // Define the format of the log messages
  format: winston.format.combine(
    winston.format.colorize(), // Adds color to log levels (e.g., 'info' is green, 'error' is red)
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Adds a timestamp to each log entry
    // Custom printf format function to control the output string
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      let logMessage = `${timestamp} [${level}]: ${message}`;
      // If there's any additional metadata, append it as a JSON string
      if (Object.keys(meta).length) {
        logMessage += ` ${JSON.stringify(meta)}`;
      }
      return logMessage;
    })
  ),
  // Define where the logs should be transported (e.g., console, file, HTTP endpoint)
  transports: [
    new winston.transports.Console(), // Log messages to the console
    // You can uncomment and configure these to log to files:
    // new winston.transports.File({ filename: 'error.log', level: 'error' }), // Logs errors to 'error.log'
    // new winston.transports.File({ filename: 'combined.log' }), // Logs all levels to 'combined.log'
  ],
});

// A Map to store and reuse `AppLogger` instances by name.
// This ensures that for a given module name, you always get the same logger instance,
// maintaining consistency and potentially saving resources.
const loggers: Map<string, AppLogger> = new Map();

/**
 * Retrieves a logger instance for a given module name.
 * If a logger for the name already exists, it returns the existing one.
 * Otherwise, it creates a new child logger.
 * @param name The name of the module or component (e.g., 'AgentService', 'BrowserManager').
 * This name will appear in the log output's metadata.
 * @returns An `AppLogger` instance conforming to the defined interface.
 */
export function getLogger(name: string): AppLogger {
  // If a logger with this name already exists, return it
  if (loggers.has(name)) {
    return loggers.get(name)!; // Non-null assertion as we know it exists
  }

  // If not, create a new child logger.
  // Winston's child loggers inherit transports and formats from the parent logger,
  // and add specific metadata (here, 'module: name').
  const childLogger = logger.child({ module: name });

  // Wrap the Winston child logger methods to explicitly conform to our `AppLogger` interface.
  // This step ensures type safety and consistency across the application.
  const appLogger: AppLogger = {
    info: (message: string, ...args: any[]) => childLogger.info(message, ...args),
    warn: (message: string, ...args: any[]) => childLogger.warn(message, ...args),
    error: (message: string, ...args: any[]) => childLogger.error(message, ...args),
    debug: (message: string, ...args: any[]) => childLogger.debug(message, ...args),
  };

  // Store the newly created logger instance in the map
  loggers.set(name, appLogger);
  return appLogger;
}