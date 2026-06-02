import { Mic, MicOff } from "lucide-react";
import { useVoiceControl } from "../hooks/useVoiceControl";

export function VoiceFab() {
  const { listening, status, supported, toggleListen } = useVoiceControl();

  if (!supported) return null;

  return (
    <div className="fixed right-4 z-50 flex flex-col items-end gap-2" style={{ bottom: 88 }}>
      {status && (
        <div
          className="px-3 py-1.5 rounded-full text-xs shadow-lg"
          style={{ background: "#0d1f3c", border: "1px solid #3b82f6", color: "#93c5fd" }}
        >
          {status}
        </div>
      )}
      <button
        type="button"
        onClick={toggleListen}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-transform active:scale-95"
        style={{
          background: listening
            ? "linear-gradient(135deg, #ef4444, #dc2626)"
            : "linear-gradient(135deg, #3b82f6, #1d4ed8)",
          boxShadow: listening ? "0 0 0 8px rgba(239,68,68,0.25)" : "0 8px 24px rgba(59,130,246,0.45)",
        }}
        aria-label={listening ? "Stop listening" : "Voice control"}
      >
        {listening ? <MicOff size={22} color="#fff" /> : <Mic size={22} color="#fff" />}
      </button>
      <span className="text-[9px] pr-1" style={{ color: "#4a6585" }}>
        Hermes voice
      </span>
    </div>
  );
}
