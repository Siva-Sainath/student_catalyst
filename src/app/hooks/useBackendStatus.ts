import { useEffect, useState } from "react";
import { MAC_SERVER_URL } from "../config/environment";

export function useBackendStatus() {
  const [ok, setOk] = useState<boolean | null>(null);
  const [detail, setDetail] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${MAC_SERVER_URL}/health`, { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        if (cancelled) return;
        setOk(res.ok && data.model_available !== false);
        setDetail(data.hermes_harness?.fast_model || MAC_SERVER_URL);
      } catch {
        if (!cancelled) {
          setOk(false);
          setDetail(MAC_SERVER_URL);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { ok, detail, url: MAC_SERVER_URL };
}
