"use strict";
// src/index.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config"); // Load environment variables from .env file immediately
const http_1 = __importDefault(require("http")); // Node.js built-in HTTP module
const app_1 = __importDefault(require("./server/app")); // Import your Express app
const agent_1 = __importDefault(require("./server/routes/agent")); // Import your agent API routes
const wsServer_1 = require("./server/websocket/wsServer"); // Import WebSocket server functions
const logger_1 = require("./shared/logger"); // Import your custom logger
const logger = (0, logger_1.getLogger)('App'); // Get a logger instance for the main application
const PORT = process.env.PORT; // Define the port for the server, default to 5000
// Create an HTTP server from the Express app
const server = http_1.default.createServer(app_1.default);
// Initialize the WebSocket server and attach it to the HTTP server
(0, wsServer_1.initWebSocketServer)(server);
// --- Register API Routes ---
// Mount the agent routes under the /api/agent path
app_1.default.use('/api/agent', agent_1.default);
logger.info('Agent API routes mounted under /api/agent');
// --- Global Error Handling Middleware ---
// This is a crucial Express error handling middleware.
// It catches errors passed via `next(err)` from route handlers or middleware.
app_1.default.use((err, req, res, next) => {
    logger.error(`Unhandled error: ${err.message}`, err); // Log the error with stack trace
    // Send a generic 500 Internal Server Error response to the client
    if (res.headersSent) {
        // If headers have already been sent, delegate to default Express error handler
        return next(err);
    }
    res.status(500).json({ success: false, message: 'An unexpected server error occurred.' });
});
logger.info('Global error handling middleware registered.');
// --- Start the HTTP Server ---
server.listen(PORT, () => {
    logger.info(`Server listening on port ${PORT}`);
    logger.info(`Access agent status at http://localhost:${PORT}/api/agent/status`);
});
// --- Graceful Shutdown ---
// Handle process termination signals to gracefully close the server and WebSocket connections.
const gracefulShutdown = () => __awaiter(void 0, void 0, void 0, function* () {
    logger.info('Initiating graceful shutdown...');
    // 1. Close the HTTP server
    server.close((err) => __awaiter(void 0, void 0, void 0, function* () {
        if (err) {
            logger.error(`Error closing HTTP server: ${err.message}`, err);
        }
        else {
            logger.info('HTTP server closed.');
        }
        // 2. Close WebSocket server
        yield (0, wsServer_1.closeWebSocketServer)(); // Await WebSocket server closure
        logger.info('Application shut down.');
        process.exit(err ? 1 : 0); // Exit process with appropriate code
    }));
});
process.on('SIGTERM', gracefulShutdown); // Handle termination signal (e.g., from `kill` command, Docker stop)
process.on('SIGINT', gracefulShutdown); // Handle interrupt signal (e.g., Ctrl+C)
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Application specific logging, throwing an error, or other logic here
    // Depending on severity, might want to call gracefulShutdown();
});
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // Catching uncaught exceptions to perform graceful shutdown
    // This is a last resort; ideally, errors are caught closer to their source.
    gracefulShutdown();
});
logger.info('Graceful shutdown handlers registered.');
