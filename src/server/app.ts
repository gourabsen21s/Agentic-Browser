// src/server/app.ts

import express from 'express';
import cors from 'cors'; // For Cross-Origin Resource Sharing
import { getLogger } from '../shared/logger'; // Import your custom logger

const logger = getLogger('ExpressApp'); // Get a logger instance for the Express application

// Create an Express application instance
const app = express();

// --- Middleware Configuration ---

// Enable CORS for all origins. This is useful for development when your
// frontend might be on a different port or domain than your backend.
// In production, you'd want to restrict this to specific origins for security.
app.use(cors());
logger.info('CORS enabled for all origins.');

// Enable JSON body parsing for incoming requests.
// This allows Express to automatically parse JSON-formatted request bodies.
app.use(express.json());
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
export default app;