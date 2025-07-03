// src/shared/langchain.d.ts

// This file is used for declaration merging to augment types from external modules.
// It specifically adds our custom properties/overrides to LangChain's types.

import { MessageContent } from "@langchain/core/messages";
import { ToolCallingMethod } from "./types"; // Import our ToolCallingMethod

// Augment the @langchain/core/messages module
declare module '@langchain/core/messages' {
  // LangChain's MessageContent type is already a complex union.
  // We need to ensure our addition integrates correctly without
  // conflicting with its existing definition.
  // A common pattern is to extend its own MessageContent type,
  // or define our custom message part types and add them to the union.
  // The safest way is often to explicitly redefine the `content` property
  // using all allowed types, including LangChain's `MessageContent` as a base.

  // Re-declare BaseMessage to include our specific array content type for vision models.
  // By including `MessageContent` from LangChain, we ensure compatibility.
  interface BaseMessage {
    content: MessageContent | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
  }
}

// Augment the @langchain/core/language_models/chat_models module
declare module '@langchain/core/language_models/chat_models' {
  // Add our custom properties used by LLMService for tool calling method verification.
  interface BaseChatModel {
    _verified_api_keys?: boolean;
    _verified_tool_calling_method?: ToolCallingMethod | null;
  }
}