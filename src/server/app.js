"use strict";
// src/server/app.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors")); // For Cross-Origin Resource Sharing
const logger_1 = require("../shared/logger"); // Import your custom logger
const logger = (0, logger_1.getLogger)('ExpressApp'); // Get a logger instance for the Express application
// Create an Express application instance
const app = (0, express_1.default)();
// --- Middleware Configuration ---
// Enable CORS for all origins. This is useful for development when your
// frontend might be on a different port or domain than your backend.
// In production, you'd want to restrict this to specific origins for security.
app.use((0, cors_1.default)());
logger.info('CORS enabled for all origins.');
// Enable JSON body parsing for incoming requests.
// This allows Express to automatically parse JSON-formatted request bodies.
app.use(express_1.default.json());
logger.info('JSON body parsing enabled.');
// --- Basic Route ---
// A simple health check route to ensure the server is running.
app.get('/', (req, res) => {
    res.status(200).send('Agentic Browser Backend is running!');
    logger.debug('Root route accessed (health check).');
});
// TODO: Future middleware (e.g., authentication, advanced logging, error handling)
// app.use(authMiddleware);
// app.use(requestLoggerMiddleware);
// app.use(errorHandlerMiddleware);
// Export the Express app instance.
// Route definitions will be imported and applied to this app instance in another file.
exports.default = app;
