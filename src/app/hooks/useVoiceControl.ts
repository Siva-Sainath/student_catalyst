import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import VoiceService from "../services/voiceService";
import MvpService from "../services/mvpService";
import { resolveVoiceRoute, speak } from "../lib/voiceRoutes";

export function useVoiceControl() {
  const navigate = useNavigate();
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<any>(null);
  const runRef = useRef<(text: string) => Promise<void>>(async () => {});

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
        setTimeout(() => setStatus(null), 2000);
      }
    },
    [navigate]
  );

  runRef.current = runCommand;

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SR);
    if (!SR) return;

    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onstart = () => {
      setListening(true);
      setStatus("Listening…");
    };
    rec.onend = () => {
      setListening(false);
    };
    rec.onerror = (e: any) => {
      setListening(false);
      if (e.error !== "aborted" && e.error !== "no-speech") {
        setStatus(`Mic: ${e.error}`);
      }
    };
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript as string;
      void runRef.current(text);
    };
    recRef.current = rec;
  }, []);

  const toggleListen = useCallback(() => {
    const rec = recRef.current;
    if (!rec) {
      setStatus("Use Chrome or Safari for voice");
      return;
    }
    if (listening) {
      rec.stop();
      return;
    }
    try {
      rec.start();
    } catch {
      setStatus("Tap again to speak");
    }
  }, [listening]);

  return { listening, status, supported, toggleListen, runCommand };
}
