/**
 * useVoiceControl — MediaRecorder → Whisper STT → NLP command pipeline.
 *
 * Replaces the old webkitSpeechRecognition approach with a universal
 * MediaRecorder solution that works in ALL browsers (Chrome, Firefox, Safari).
 * Audio is sent to the local faster-whisper backend endpoint — no cloud.
 */

import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router";
import VoiceService from "../services/voiceService";
import MvpService from "../services/mvpService";
import { resolveVoiceRoute, speak } from "../lib/voiceRoutes";

type Status =
  | null
  | "Speak now…"
  | "Transcribing…"
  | "Processing…"
  | "Hermes processing…"
  | string;

export function useVoiceControl() {
  const navigate = useNavigate();
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  // MediaRecorder is supported everywhere that has getUserMedia
  const [supported] = useState(
    () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // ── Run the text through the NLP command pipeline ─────────────────────────
  const runCommand = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setStatus("Hermes processing…");
      try {
        await MvpService.ensureSession();
        const result = await VoiceService.executeCommand(trimmed);
        const path = resolveVoiceRoute(result.action, (result as any).route);
        speak(result.response);

        if (path) {
          if (result.action === "chat" && result.params?.message) {
            navigate(path, { state: { voiceMessage: result.params.message } });
          } else {
            navigate(path);
          }
        } else if (result.action === "chat") {
          navigate("/chat", { state: { voiceMessage: trimmed } });
        }
      } catch (err) {
        speak("Sorry, I could not process that command.");
        setStatus(err instanceof Error ? err.message : "Voice failed");
      } finally {
        setTimeout(() => setStatus(null), 2500);
      }
    },
    [navigate]
  );

  // ── Stop recording and send blob to Whisper ────────────────────────────────
  const stopAndTranscribe = useCallback(async (blob: Blob) => {
    // Release mic
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setListening(false);

    if (blob.size < 1000) {
      setStatus("No audio captured — tap mic and try again");
      setTimeout(() => setStatus(null), 2500);
      return;
    }

    setStatus("Transcribing…");
    try {
      const { text } = await VoiceService.transcribeAudio(blob);
      if (!text) {
        setStatus("Nothing heard — please try again");
        setTimeout(() => setStatus(null), 2500);
        return;
      }
      await runCommand(text);
    } catch (err) {
      speak("Transcription failed. Please try again.");
      setStatus(err instanceof Error ? err.message : "Transcription failed");
      setTimeout(() => setStatus(null), 3000);
    }
  }, [runCommand]);

  // ── Toggle mic on/off ──────────────────────────────────────────────────────
  const toggleListen = useCallback(async () => {
    // ── STOP ──
    if (listening) {
      mediaRecorderRef.current?.stop();
      return;
    }

    // ── START ──
    if (!supported) {
      setStatus("Microphone not supported in this browser");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      // Prefer webm/opus; fall back gracefully for Safari (ogg isn't available)
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";                // Firefox fallback

      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        void stopAndTranscribe(blob);
      };

      recorder.onerror = () => {
        setListening(false);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        setStatus("Microphone error — please try again");
        setTimeout(() => setStatus(null), 2500);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setListening(true);
      setStatus("Speak now…");
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        setStatus("Allow microphone access in browser settings");
      } else {
        setStatus("Could not access microphone");
      }
      setTimeout(() => setStatus(null), 3000);
    }
  }, [listening, supported, stopAndTranscribe]);

  return { listening, status, supported, toggleListen, runCommand };
}
