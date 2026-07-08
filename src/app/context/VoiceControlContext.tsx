import React, { createContext, useContext } from "react";
import { useVoiceControl } from "../hooks/useVoiceControl";

type VoiceCtx = ReturnType<typeof useVoiceControl>;

const VoiceControlContext = createContext<VoiceCtx | null>(null);

export function VoiceControlProvider({ children }: { children: React.ReactNode }) {
  const value = useVoiceControl();
  return <VoiceControlContext.Provider value={value}>{children}</VoiceControlContext.Provider>;
}

export function useVoiceControlContext() {
  const ctx = useContext(VoiceControlContext);
  if (!ctx) throw new Error("useVoiceControlContext must be inside VoiceControlProvider");
  return ctx;
}
