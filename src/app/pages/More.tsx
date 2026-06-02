import { useNavigate } from "react-router";
import {
  DollarSign,
  Briefcase,
  Train,
  Award,
  ClipboardList,
  Settings,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
} from "lucide-react";

const features = [
  {
    label: "Finance",
    desc: "Track expenses & savings",
    icon: DollarSign,
    path: "/finance",
    color: "var(--success-500)",
    bg: "rgba(34,197,94,0.12)",
  },
  {
    label: "Jobs & Internships",
    desc: "Latest opportunities",
    icon: Briefcase,
    path: "/jobs",
    color: "var(--warning-500)",
    bg: "rgba(245,158,11,0.12)",
  },
  {
    label: "Travel Planner",
    desc: "Routes & transport for day scholars",
    icon: Train,
    path: "/travel",
    color: "var(--primary-400)",
    bg: "rgba(6,182,212,0.12)",
  },
  {
    label: "Placement Tracker",
    desc: "Track interviews & applications",
    icon: Award,
    path: "/placement",
    color: "var(--secondary-500)",
    bg: "rgba(139,92,246,0.12)",
  },
  {
    label: "Assignments",
    desc: "Deadlines & task manager",
    icon: ClipboardList,
    path: "/assignments",
    color: "var(--danger-400)",
    bg: "rgba(244,63,94,0.12)",
  },
];

const settings = [
  { label: "Notifications", icon: Bell },
  { label: "Settings", icon: Settings },
  { label: "Help & Feedback", icon: HelpCircle },
  { label: "Sign Out", icon: LogOut, danger: true },
];

export function More() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  return (
    <div className="px-4 py-3 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl text-primary">
          More
        </h1>
        <p className="text-xs text-secondary">
          All features & settings
        </p>
      </div>

      {/* Profile card */}
      <div
        className="rounded-2xl p-4 flex items-center gap-4"
        style={{
          background: "linear-gradient(135deg, #0d2461 0%, #1a3a8f 100%)",
          border: "1px solid #2a4aaa",
        }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
          style={{ background: "rgba(255,255,255,0.15)" }}
        >
          🧑‍💻
        </div>
        <div className="flex-1">
          <p className="text-base text-neutral-50">
            {user?.name || "Rahul Sharma"}
          </p>
          <p className="text-xs text-secondary">
            {user?.email || "21BCE1234@example.com"} &middot; B.Tech CSE
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#bfdbfe" }}>
            VIT Chennai &middot; Semester 6
          </p>
        </div>
        <button
          className="px-3 py-1.5 rounded-xl text-xs"
          style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}
        >
          Edit
        </button>
      </div>

      {/* Features grid */}
      <div>
        <p className="text-xs mb-3 text-secondary">
          FEATURES
        </p>
        <div className="space-y-2">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <button
                key={f.label}
                onClick={() => navigate(f.path)}
                className="w-full flex items-center gap-3 rounded-2xl p-3 text-left transition-all active:scale-[0.98] bg-secondary border border-primary"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: f.bg }}
                >
                  <Icon size={18} style={{ color: f.color }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-primary">
                    {f.label}
                  </p>
                  <p className="text-xs text-secondary">
                    {f.desc}
                  </p>
                </div>
                <ChevronRight size={16} className="text-muted" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Settings */}
      <div>
        <p className="text-xs mb-3 text-secondary">
          ACCOUNT
        </p>
        <div
          className="rounded-2xl overflow-hidden border border-primary"
        >
          {settings.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
                style={{
                  background: "var(--bg-secondary)",
                  borderTop: i > 0 ? "1px solid var(--border-primary)" : "none",
                }}
              >
                <Icon
                  size={16}
                  style={{ color: (item as any).danger ? "var(--danger-500)" : "var(--text-secondary)" }}
                />
                <span
                  className="flex-1 text-sm"
                  style={{ color: (item as any).danger ? "var(--danger-500)" : "var(--text-primary)" }}
                >
                  {item.label}
                </span>
                <ChevronRight size={14} className="text-muted" />
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-center text-[10px] pb-2 text-muted">
        CampusAI v1.0.0 &middot; VIT Chennai
      </p>
    </div>
  );
}
