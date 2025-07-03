// src/shared/telemetryService.ts

import { AgentTelemetryEvent } from './types'; // Import AgentTelemetryEvent from your shared types
import { getLogger } from './logger'; // Import your custom logger

const logger = getLogger('TelemetryService'); // Get a logger instance for this service

/**
 * A service for capturing and managing product telemetry events.
 * It queues events internally and provides a method to flush them,
 * typically by sending them to a remote analytics backend.
 */
export class ProductTelemetry {
  private eventsQueue: AgentTelemetryEvent[] = []; // Internal queue to hold telemetry events
  private isFlushing: boolean = false; // A flag to prevent multiple concurrent flush operations

  /**
   * Captures a telemetry event by adding it to an internal queue.
   * Events are not sent immediately but are batched for later flushing.
   * @param event The `AgentTelemetryEvent` object to capture.
   */
  capture(event: AgentTelemetryEvent): void {
    logger.debug(`Capturing telemetry event: ${event.constructor.name}`);
    this.eventsQueue.push(event); // Add the event to the end of the queue
    // In a production environment, you might implement various strategies to trigger `flush()`:
    // - On a fixed time interval (e.g., every 30 seconds)
    // - When the `eventsQueue` reaches a certain size (e.g., every 10 events)
    // - Upon application shutdown (to ensure all pending events are sent)
    // - When certain critical events occur
  }

  /**
   * Processes all queued telemetry events and sends them.
   * This method ensures only one flush operation runs at a time to manage resources
   * and prevent duplicate sends.
   */
  async flush(): Promise<void> {
    // If a flush operation is already in progress, simply return.
    if (this.isFlushing) {
      logger.debug('Telemetry flush already in progress. Skipping new flush request.');
      return;
    }

    this.isFlushing = true; // Set the flag to indicate that flushing is now active
    logger.info(`Initiating telemetry flush. ${this.eventsQueue.length} events in queue.`);

    // Process events one by one from the front of the queue until it's empty.
    while (this.eventsQueue.length > 0) {
      const event = this.eventsQueue.shift(); // Remove the next event from the queue
      if (event) {
        try {
          // --- Placeholder for actual telemetry sending logic ---
          // In a real application, you would replace this `setTimeout`
          // with an actual HTTP request (e.g., using `fetch` or `axios`)
          // to send `event.data` to your analytics platform or backend API.
          logger.debug(`Simulating sending telemetry event: ${JSON.stringify(event.data)}`);
          await new Promise(resolve => setTimeout(resolve, 50)); // Simulate a small network delay
          logger.debug(`Telemetry event sent: ${event.constructor.name}`);
        } catch (error) {
          // Log any errors that occur during the sending process.
          logger.error(`Failed to send telemetry event ${event.constructor.name}: ${error}`);
          // Decide on your error handling strategy:
          // - Re-queue the event (e.g., `this.eventsQueue.push(event)`) for a retry.
          // - Log it to a dead-letter queue or file for manual inspection.
          // - Discard it if it's a non-critical event.
        }
      }
    }
    this.isFlushing = false; // Reset the flag once flushing is complete
    logger.info('Telemetry flush complete. Queue is empty.');
  }
}