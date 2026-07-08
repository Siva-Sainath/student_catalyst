import { Mic, MicOff } from "lucide-react";
import { useVoiceControlContext } from "../context/VoiceControlContext";

export function VoiceFab() {
  const { listening, status, supported, toggleListen } = useVoiceControlContext();

  if (!supported) return null;

  return (
    <div className="fixed right-4 z-50 flex flex-col items-end gap-2" style={{ bottom: 88 }}>
      {status && (
        <div
          className="px-3 py-1.5 rounded-full text-xs shadow-lg animate-fade-in"
          style={{ background: "#0c0c0e", border: "1px solid #19191d", color: "#00f0ff" }}
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
            ? "linear-gradient(135deg, #f43f5e, #e11d48)"
            : "linear-gradient(135deg, #00f0ff, #8b5cf6)",
          boxShadow: listening ? "0 0 0 8px rgba(244,63,94,0.25)" : "0 8px 24px rgba(0,240,255,0.25)",
        }}
        aria-label={listening ? "Stop listening" : "Voice control"}
      >
        {listening ? <MicOff size={22} color="#fff" /> : <Mic size={22} color="#fff" />}
      </button>
      <span className="text-[9px] pr-1" style={{ color: "#52525b" }}>
        Hermes voice
      </span>
    </div>
  );
}
