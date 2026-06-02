/**
 * Voice service - voice command execution.
 */

import ApiClient from "./apiClient";

export interface VoiceCommandResult {
  action: string;
  params: Record<string, any>;
  response: string;
  route?: string | null;
}

// Timeout for voice commands (10 seconds)
const VOICE_COMMAND_TIMEOUT = 10000;

export class VoiceService {
  /**
   * Execute voice command with timeout.
   */
  static async executeCommand(text: string): Promise<VoiceCommandResult> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error("Voice command timed out. Please try again."));
      }, VOICE_COMMAND_TIMEOUT);
    });

    try {
      const responsePromise = ApiClient.executeVoiceCommand(text);
      const response = await Promise.race([responsePromise, timeoutPromise]);

      if (!response.ok) {
        throw new Error(response.error || "Failed to execute voice command");
      }

      return response.data as VoiceCommandResult;
    } catch (error) {
      // Return a default response for unknown commands if there's an error
      throw error;
    }
  }
}

export default VoiceService;
