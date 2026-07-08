/**
 * Voice service — transcription via local Whisper + command execution.
 *
 * Flow:
 *   MediaRecorder (WebM/Opus blob)
 *     → POST /agent/voice/transcribe  (faster-whisper, 100% local)
 *     → text
 *     → POST /agent/voice/command/enhanced (NLP routing)
 */

import ApiClient from "./apiClient";

export interface VoiceCommandResult {
  action: string;
  params: Record<string, any>;
  response: string;
  route?: string | null;
}

export interface TranscribeResult {
  text: string;
  duration?: number;
}

// Timeout: 30 s to give Whisper plenty of room on first-run model load
const TRANSCRIBE_TIMEOUT = 30_000;
const COMMAND_TIMEOUT = 10_000;

export class VoiceService {
  /**
   * Send an audio Blob to the backend Whisper endpoint and return the transcript.
   */
  static async transcribeAudio(blob: Blob): Promise<TranscribeResult> {
    const form = new FormData();
    // Give it a name so the server can detect the extension
    const ext = blob.type.includes("ogg") ? "ogg" : "webm";
    form.append("file", blob, `recording.${ext}`);

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Whisper transcription timed out (30 s).")),
        TRANSCRIBE_TIMEOUT
      )
    );

    const fetchPromise = ApiClient.postFormData("/agent/voice/transcribe", form);

    const response = await Promise.race([fetchPromise, timeoutPromise]);
    if (!response.ok) {
      throw new Error(response.error || "Transcription failed");
    }
    return response.data as TranscribeResult;
  }

  /**
   * Execute a voice command string through the NLP routing pipeline.
   */
  static async executeCommand(text: string): Promise<VoiceCommandResult> {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Voice command timed out. Please try again.")),
        COMMAND_TIMEOUT
      )
    );

    const response = await Promise.race([
      ApiClient.executeVoiceCommand(text),
      timeoutPromise,
    ]);

    if (!response.ok) {
      throw new Error(response.error || "Failed to execute voice command");
    }

    return response.data as VoiceCommandResult;
  }
}

export default VoiceService;
