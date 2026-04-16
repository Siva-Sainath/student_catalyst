import { useNavigate } from "react-router";
import {
  Bell,
  MapPin,
  AlertTriangle,
  Calendar,
  TrendingUp,
  Briefcase,
  DollarSign,
  Train,
  Award,
  ClipboardList,
  ChevronRight,
  Clock,
  Zap,
} from "lucide-react";

const quickActions = [
  { label: "Finance", icon: DollarSign, path: "/finance", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  { label: "Jobs", icon: Briefcase, path: "/jobs", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  { label: "Travel", icon: Train, path: "/travel", color: "#06b6d4", bg: "rgba(6,182,212,0.12)" },
  { label: "Placement", icon: Award, path: "/placement", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
  { label: "Tasks", icon: ClipboardList, path: "/assignments", color: "#f43f5e", bg: "rgba(244,63,94,0.12)" },
  { label: "Analytics", icon: TrendingUp, path: "/attendance", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
];

const todayClasses = [
  { subject: "Data Structures", time: "9:00 AM", room: "Block A - 201", status: "upcoming" },
  { subject: "Operating Systems", time: "11:00 AM", room: "Block B - 105", status: "cancelled" },
  { subject: "Computer Networks", time: "2:00 PM", room: "Block C - 301", status: "upcoming" },
  { subject: "DBMS Lab", time: "4:00 PM", room: "Lab 2", status: "upcoming" },
];

export function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="px-4 py-3 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs" style={{ color: "#6b8cad" }}>
            Thursday, 26 March 2026
          </p>
          <h1 className="text-xl" style={{ color: "#e8f0fe" }}>
            Good morning, Rahul 👋
          </h1>
        </div>
        <div className="relative">
          <button
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "#0d1f3c", border: "1px solid #1e3561" }}
          >
            <Bell size={18} style={{ color: "#3b82f6" }} />
          </button>
          <span
            className="absolute top-0 right-0 w-4 h-4 rounded-full text-[9px] flex items-center justify-center"
            style={{ background: "#ef4444", color: "#fff" }}
          >
            3
          </span>
        </div>
      </div>

      {/* Student ID card */}
      <div
        className="rounded-2xl p-4 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0d2461 0%, #1a3a8f 50%, #1e4ac9 100%)",
          border: "1px solid #2a4aaa",
        }}
      >
        {/* decorative circles */}
        <div
          className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-20"
          style={{ background: "#60a5fa" }}
        />
        <div
          className="absolute -right-2 top-12 w-16 h-16 rounded-full opacity-10"
          style={{ background: "#93c5fd" }}
        />
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs" style={{ color: "#93c5fd" }}>
                VIT Chennai
              </p>
              <h2 className="text-base" style={{ color: "#ffffff" }}>
                Rahul Sharma
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "#bfdbfe" }}>
                21BCE1234 · CSE · Sem 6
              </p>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              <span className="text-xl">🎓</span>
            </div>
          </div>
          <div className="flex gap-4 mt-3">
            <div>
              <p className="text-xs" style={{ color: "#93c5fd" }}>
                Attendance
              </p>
              <p className="text-base" style={{ color: "#4ade80" }}>
                78.5%
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "#93c5fd" }}>
                CGPA
              </p>
              <p className="text-base" style={{ color: "#fbbf24" }}>
                8.7
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "#93c5fd" }}>
                Credits
              </p>
              <p className="text-base" style={{ color: "#e8f0fe" }}>
                142
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cancelled class alert */}
      <div
        className="rounded-2xl p-3 flex items-center gap-3"
        style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(239,68,68,0.2)" }}
        >
          <AlertTriangle size={18} style={{ color: "#ef4444" }} />
        </div>
        <div className="flex-1">
          <p className="text-sm" style={{ color: "#e8f0fe" }}>
            1 class cancelled today
          </p>
          <p className="text-xs" style={{ color: "#ef4444" }}>
            Operating Systems · 11:00 AM by Prof. Mehta
          </p>
        </div>
        <ChevronRight size={16} style={{ color: "#6b8cad" }} />
      </div>

      {/* Upcoming holiday */}
      <div
        className="rounded-2xl p-3 flex items-center gap-3"
        style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(245,158,11,0.2)" }}
        >
          <Calendar size={18} style={{ color: "#f59e0b" }} />
        </div>
        <div className="flex-1">
          <p className="text-sm" style={{ color: "#e8f0fe" }}>
            Holiday in 2 days 🎉
          </p>
          <p className="text-xs" style={{ color: "#f59e0b" }}>
            Ram Navami — Saturday, 28 March
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Bunk Left", value: "4", sub: "classes safe", color: "#22c55e", icon: "✓" },
          { label: "Due Today", value: "2", sub: "assignments", color: "#f59e0b", icon: "📝" },
          { label: "Exam in", value: "12d", sub: "DSA — Unit 5", color: "#3b82f6", icon: "⏱" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl p-3 flex flex-col"
            style={{ background: "#0a1628", border: "1px solid #1e3561" }}
          >
            <span className="text-base">{s.icon}</span>
            <p className="text-lg mt-1" style={{ color: s.color }}>
              {s.value}
            </p>
            <p className="text-[10px]" style={{ color: "#e8f0fe" }}>
              {s.label}
            </p>
            <p className="text-[9px]" style={{ color: "#6b8cad" }}>
              {s.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Today's schedule */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm" style={{ color: "#e8f0fe" }}>
            Today's Classes
          </h3>
          <button
            onClick={() => navigate("/schedule")}
            className="text-xs"
            style={{ color: "#3b82f6" }}
          >
            See all
          </button>
        </div>
        <div className="space-y-2">
          {todayClasses.map((cls, i) => (
            <div
              key={i}
              className="rounded-xl p-3 flex items-center gap-3"
              style={{
                background: cls.status === "cancelled" ? "rgba(239,68,68,0.06)" : "#0a1628",
                border: `1px solid ${cls.status === "cancelled" ? "rgba(239,68,68,0.2)" : "#1e3561"}`,
                opacity: cls.status === "cancelled" ? 0.8 : 1,
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background:
                    cls.status === "cancelled"
                      ? "rgba(239,68,68,0.15)"
                      : "rgba(59,130,246,0.15)",
                }}
              >
                <Clock
                  size={14}
                  style={{ color: cls.status === "cancelled" ? "#ef4444" : "#3b82f6" }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm"
                  style={{
                    color: "#e8f0fe",
                    textDecoration: cls.status === "cancelled" ? "line-through" : "none",
                  }}
                >
                  {cls.subject}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin size={10} style={{ color: "#6b8cad" }} />
                  <p className="text-[10px]" style={{ color: "#6b8cad" }}>
                    {cls.room}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs" style={{ color: "#6b8cad" }}>
                  {cls.time}
                </p>
                {cls.status === "cancelled" && (
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444" }}
                  >
                    Cancelled
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-sm mb-2" style={{ color: "#e8f0fe" }}>
          Quick Access
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="rounded-2xl p-3 flex flex-col items-center gap-2 transition-all active:scale-95"
                style={{ background: "#0a1628", border: "1px solid #1e3561" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: action.bg }}
                >
                  <Icon size={18} style={{ color: action.color }} />
                </div>
                <span className="text-xs" style={{ color: "#e8f0fe" }}>
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* AI tip */}
      <div
        className="rounded-2xl p-3 flex items-start gap-3 mb-2"
        style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(59,130,246,0.2)" }}
        >
          <Zap size={14} style={{ color: "#3b82f6" }} />
        </div>
        <div>
          <p className="text-xs" style={{ color: "#60a5fa" }}>
            AI Insight
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#8ba3c7" }}>
            You can safely skip 1 more OS class. Your attendance will still stay above 75%.
          </p>
        </div>
      </div>

      <div className="h-2" />
    </div>
  );
}
