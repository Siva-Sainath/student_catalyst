import { Outlet, useNavigate, useLocation } from "react-router";
import {
  Home,
  BookOpen,
  MessageSquare,
  Calendar,
  Grid3X3,
} from "lucide-react";
import { VoiceFab } from "./VoiceFab";
import { VoiceControlProvider } from "../context/VoiceControlContext";

const tabs = [
  { path: "/", label: "Home", icon: Home },
  { path: "/attendance", label: "Attend", icon: BookOpen },
  { path: "/chat", label: "AI Chat", icon: MessageSquare },
  { path: "/schedule", label: "Schedule", icon: Calendar },
  { path: "/more", label: "More", icon: Grid3X3 },
];

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <VoiceControlProvider>
    <div
      className="flex flex-col h-screen w-full max-w-[430px] mx-auto overflow-hidden"
      style={{ background: "#050e1d" }}
    >
      {/* Mobile status bar */}
      <div
        className="flex justify-between items-center px-5 pt-3 pb-1 shrink-0"
        style={{ background: "#050e1d" }}
      >
        <span className="text-[#e8f0fe] text-xs font-semibold">
          {new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <div className="flex items-center gap-1">
          <div className="flex gap-[2px] items-end h-3">
            {[3, 5, 7, 9].map((h, i) => (
              <div
                key={i}
                style={{
                  height: h,
                  width: 3,
                  borderRadius: 1,
                  background: i < 3 ? "#e8f0fe" : "#3b5270",
                }}
              />
            ))}
          </div>
          <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
            <path
              d="M7.5 2.2C5.3 2.2 3.3 3.1 1.9 4.6L0.5 3.1C2.3 1.2 4.8 0 7.5 0C10.2 0 12.7 1.2 14.5 3.1L13.1 4.6C11.7 3.1 9.7 2.2 7.5 2.2Z"
              fill="#e8f0fe"
            />
            <path
              d="M7.5 5.5C6.2 5.5 5 6 4.2 6.9L2.8 5.4C4 4.1 5.7 3.3 7.5 3.3C9.3 3.3 11 4.1 12.2 5.4L10.8 6.9C10 6 8.8 5.5 7.5 5.5Z"
              fill="#e8f0fe"
            />
            <circle cx="7.5" cy="9.5" r="1.5" fill="#e8f0fe" />
          </svg>
          <div
            className="flex items-center rounded-sm overflow-hidden border"
            style={{ borderColor: "#3b5270", padding: "1px 2px", gap: 2 }}
          >
            <div
              style={{
                width: 18,
                height: 9,
                borderRadius: 2,
                background: "#22c55e",
              }}
            />
            <div
              style={{
                width: 3,
                height: 5,
                borderRadius: "0 1px 1px 0",
                background: "#3b5270",
              }}
            />
          </div>
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
        <Outlet />
      </div>

      <VoiceFab />

      {/* Bottom tab bar */}
      <div
        className="shrink-0 border-t px-2 pt-2 pb-4"
        style={{
          background: "#070f20",
          borderColor: "#1e3561",
        }}
      >
        <div className="flex justify-around">
          {tabs.map((tab) => {
            const active = isActive(tab.path);
            const Icon = tab.icon;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all"
                style={{
                  background: active ? "rgba(59,130,246,0.15)" : "transparent",
                  minWidth: 56,
                }}
              >
                <Icon
                  size={22}
                  style={{ color: active ? "#3b82f6" : "#4a6585" }}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                <span
                  className="text-[10px]"
                  style={{
                    color: active ? "#3b82f6" : "#4a6585",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
    </VoiceControlProvider>
  );
}
