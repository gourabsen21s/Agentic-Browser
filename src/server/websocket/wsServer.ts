// src/server/websocket/wsServer.ts

import { WebSocket, WebSocketServer } from 'ws';
import { Server as HttpServer } from 'http'; // Import HttpServer type for Express server
import { getLogger } from '../../shared/logger'; // Import your custom logger

const logger = getLogger('WebSocketServer'); // Get a logger instance for the WebSocket server

// Define a type for your WebSocket clients to potentially store additional data
interface CustomWebSocket extends WebSocket {
  isAlive: boolean;
  // You might add client-specific data here, e.g., userId, agentId they are subscribed to
}

// CORRECTED: Removed the generic type from WebSocketServer declaration
let wss: WebSocketServer | null = null; // Declare wss as nullable

/**
 * Initializes and starts the WebSocket server.
 * It attaches the WebSocket server to an existing HTTP server (your Express app's server).
 * Sets up basic connection handling and a heartbeat mechanism.
 * @param server The HTTP server instance to attach the WebSocket server to.
 */
export const initWebSocketServer = (server: HttpServer): void => {
  if (wss) {
    logger.warn('WebSocket server already initialized. Skipping initialization.');
    return;
  }

  // Create WebSocket server instance, attached to the provided HTTP server
  wss = new WebSocketServer({ server });

  // Event listener for new WebSocket connections
  wss.on('connection', (ws: WebSocket) => { // Type 'ws' as generic WebSocket initially
    // Cast to CustomWebSocket to add custom properties for heartbeat
    const customWs = ws as CustomWebSocket;
    logger.info('New WebSocket client connected.');
    customWs.isAlive = true; // Initialize heartbeat status

    // Set up a pong listener for heartbeat. When a pong is received, mark client as alive.
    customWs.on('pong', () => {
      customWs.isAlive = true;
      logger.debug('WebSocket client pong received.');
    });

    // Handle incoming messages from clients (if your UI sends messages to the backend via WS)
    customWs.on('message', (message: Buffer) => { // Message event typically provides a Buffer
      logger.info(`Received message from WebSocket client: ${message.toString()}`);
      // TODO: Implement logic to handle messages from UI (e.g., control commands)
      // Example: customWs.send(`Echo: ${message.toString()}`);
    });

    // Handle WebSocket close event
    customWs.on('close', (code: number, reason: Buffer) => {
      logger.info(`WebSocket client disconnected. Code: ${code}, Reason: ${reason.toString()}`);
    });

    // Handle WebSocket errors
    customWs.on('error', (error: Error) => { // Explicitly type error
      logger.error(`WebSocket client error: ${error.message}`);
    });
  });

  // Set up a heartbeat interval to detect and terminate unresponsive clients.
  const heartbeatInterval = setInterval(() => {
    if (!wss) return; // Ensure wss exists before proceeding

    // Iterate over all connected clients
    // CORRECTED: Explicitly type 'ws' in forEach callback
    wss.clients.forEach((ws: WebSocket) => { 
      const customWs = ws as CustomWebSocket; // Cast to CustomWebSocket for custom properties
      if (customWs.isAlive === false) {
        logger.warn('WebSocket client unresponsive, terminating connection.');
        return customWs.terminate(); // Terminate unresponsive client
      }

      customWs.isAlive = false; // Mark as not alive, expecting a pong back
      customWs.ping(); // Send ping to client
      logger.debug('WebSocket client ping sent.');
    });
  }, 30000); // Ping every 30 seconds

  // Handle server close event to clean up the heartbeat interval
  wss.on('close', () => {
    clearInterval(heartbeatInterval); // Clear the interval when the server closes
    logger.info('WebSocket server closed. Heartbeat interval cleared.');
  });

  logger.info('WebSocket server initialized successfully.');
};

/**
 * Sends a message to all connected WebSocket clients.
 * This function can be called from other parts of your application (e.g., AgentService)
 * to push real-time updates to the frontend UI.
 * @param message The message (any JSON-serializable data) to send to clients.
 */
export const broadcastWebSocketMessage = (message: any): void => {
  if (!wss) {
    logger.warn('WebSocket server not initialized. Cannot broadcast message.');
    return;
  }

  const data = JSON.stringify(message); // Serialize the message to a JSON string
  wss.clients.forEach((ws: WebSocket) => { // CORRECTED: Explicitly type 'ws'
    if (ws.readyState === WebSocket.OPEN) { // Only send messages to connections that are open
      ws.send(data, (error: Error | undefined) => { // CORRECTED: Explicitly type 'error'
        if (error) {
          logger.error(`Error broadcasting message to WebSocket client: ${error.message}`);
        } else {
          logger.debug('Message broadcast to WebSocket client.');
        }
      });
    }
  });
};

/**
 * Closes the WebSocket server gracefully.
 * @returns A Promise that resolves when the WebSocket server is successfully closed.
 */
export const closeWebSocketServer = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (wss) {
      wss.close((error: Error | undefined) => { // CORRECTED: Explicitly type 'error'
        if (error) {
          logger.error(`Error closing WebSocket server: ${error.message}`);
          reject(error); // Reject the promise if there's an error closing
        } else {
          logger.info('WebSocket server closed gracefully.');
          wss = null; // Clear the reference to the WebSocket server instance
          resolve(); // Resolve the promise on successful close
        }
      });
    } else {
      logger.warn('WebSocket server not initialized. Nothing to close.');
      resolve(); // Resolve immediately if server was not initialized
    }
  });
};