// src/index.ts

import 'dotenv/config'; // Load environment variables from .env file immediately
import http from 'http'; // Node.js built-in HTTP module
import app from './server/app'; // Import your Express app
import agentRoutes from './server/routes/agent'; // Import your agent API routes
import { initWebSocketServer, closeWebSocketServer } from './server/websocket/wsServer'; // Import WebSocket server functions
import { getLogger } from './shared/logger'; // Import your custom logger
import * as express from 'express'; // CORRECTED: Import * as express for namespace access

const logger = getLogger('App'); // Get a logger instance for the main application

const PORT = process.env.PORT ; // Define the port for the server, default to 5000

// Create an HTTP server from the Express app
const server = http.createServer(app);

// Initialize the WebSocket server and attach it to the HTTP server
initWebSocketServer(server);

// --- Register API Routes ---
// Mount the agent routes under the /api/agent path
app.use('/api/agent', agentRoutes);
logger.info('Agent API routes mounted under /api/agent');

// --- Global Error Handling Middleware ---
// This is a crucial Express error handling middleware.
// It catches errors passed via `next(err)` from route handlers or middleware.
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => { // Use express. prefix
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
const gracefulShutdown = async () => {
  logger.info('Initiating graceful shutdown...');

  // 1. Close the HTTP server
  server.close(async (err) => { // Make callback async if it contains awaits
    if (err) {
      logger.error(`Error closing HTTP server: ${err.message}`, err);
    } else {
      logger.info('HTTP server closed.');
    }

    // 2. Close WebSocket server
    await closeWebSocketServer(); // Await WebSocket server closure

    logger.info('Application shut down.');
    process.exit(err ? 1 : 0); // Exit process with appropriate code
  });
};

process.on('SIGTERM', gracefulShutdown); // Handle termination signal (e.g., from `kill` command, Docker stop)
process.on('SIGINT', gracefulShutdown);  // Handle interrupt signal (e.g., Ctrl+C)
process.on('unhandledRejection', (reason: PromiseRejectionEvent, promise: Promise<any>) => { // Explicitly type parameters
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
  // Depending on severity, might want to call gracefulShutdown();
});
process.on('uncaughtException', (error: Error) => { // Explicitly type error
  logger.error('Uncaught Exception:', error);
  // Catching uncaught exceptions to perform graceful shutdown
  // This is a last resort; ideally, errors are caught closer to their source.
  gracefulShutdown();
});
logger.info('Graceful shutdown handlers registered.');