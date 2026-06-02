/**
 * Chat service - streaming homework help responses.
 */

import ApiClient from "./apiClient";

export interface ChatMessage {
  id: number;
  topic?: string;
  user_message: string;
  ai_response: string;
  created_at: string;
  rating?: number;
}

// Timeout for chat streaming (60 seconds)
const CHAT_STREAM_TIMEOUT = 60000;

export class ChatService {
  static async *streamHomeworkHelp(
    message: string,
    topic: string = "General"
  ): AsyncGenerator<string> {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let hasYielded = false;

    try {
      timeoutId = setTimeout(() => {
        if (!hasYielded) {
          throw new Error("Chat response timed out. Please try again.");
        }
      }, CHAT_STREAM_TIMEOUT);

      for await (const token of ApiClient.stream("/agent/chat/homework", { message, topic })) {
        hasYielded = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        yield token;
      }
    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      yield `\n\n⚠️ Error: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  }

  static async getChatHistory(limit: number = 10): Promise<ChatMessage[]> {
    const response = await ApiClient.getChatHistory(limit);
    if (!response.ok) {
      throw new Error(response.error);
    }
    return response.data?.history || [];
  }
}

export default ChatService;
