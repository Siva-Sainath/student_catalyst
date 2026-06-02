/**
 * Environment configuration for web app.
 */

// Mac backend API URL
// When developing locally: http://localhost:8000
// When testing on mobile: http://192.168.2.1:8000 (replace with your Mac's IP)
export const MAC_SERVER_URL = import.meta.env.VITE_MAC_SERVER_URL || "http://localhost:8000";

// OAuth configuration (optional, for admin login)
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export const CONFIG = {
  API_URL: MAC_SERVER_URL,
  GOOGLE_CLIENT_ID,
  
  // Feature flags
  FEATURES: {
    CHAT: true,
    JOBS: true,
    VOICE: true,
    ATTENDANCE: true,
    FINANCE: true,
    CONTROL_PANEL: true, // Admin only
  },
  
  // UI settings
  UI: {
    DARK_MODE_DEFAULT: true,
    STREAMING_ANIMATION: true, // Animate streaming responses
    AUTO_LOAD_ON_MOUNT: true, // Auto-fetch data when page loads
  },
  
  // Timeouts
  TIMEOUTS: {
    CHAT_RESPONSE: 60000, // 60 seconds for LLM response
    API_CALL: 30000, // 30 seconds for other calls
  },
};

export default CONFIG;
