import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, TrendingDown, TrendingUp, Zap } from "lucide-react";
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
} from "recharts";
import AttendanceService from "../services/attendanceService";

const subjects = [
  { name: "Data Structures", code: "CSE2002", attended: 32, total: 40, prof: "Dr. Krishnan" },
  { name: "Operating Systems", code: "CSE2003", attended: 26, total: 38, prof: "Prof. Mehta" },
  { name: "Computer Networks", code: "CSE2004", attended: 30, total: 35, prof: "Dr. Rajan" },
  { name: "DBMS", code: "CSE2005", attended: 28, total: 36, prof: "Dr. Priya" },
  { name: "Software Engineering", code: "CSE2006", attended: 22, total: 30, prof: "Prof. Anand" },
  { name: "DBMS Lab", code: "CSE2007", attended: 12, total: 14, prof: "Dr. Priya" },
];

function getColor(pct: number) {
  if (pct >= 80) return "#22c55e";
  if (pct >= 75) return "#f59e0b";
  return "#ef4444";
}

function getBunkable(attended: number, total: number) {
  // Can bunk if: (attended / (total + x)) >= 0.75  → x = (attended - 0.75*total) / 0.75
  const extra = Math.floor((attended - 0.75 * total) / 0.75);
  return Math.max(0, extra);
}

function getNeeded(attended: number, total: number) {
  // Need to attend n more: (attended + n) / (total + n) >= 0.75
  // n = (0.75*total - attended) / 0.25
  const pct = attended / total;
  if (pct >= 0.75) return 0;
  return Math.ceil((0.75 * total - attended) / 0.25);
}

export function Attendance() {
  const [activeTab, setActiveTab] = useState<"overview" | "bunk">("overview");
  const [dynamicSubjects, setDynamicSubjects] = useState(subjects);

  const handleLogClass = (code: string, status: "present" | "absent") => {
    setDynamicSubjects((prev) =>
      prev.map((sub) => {
        if (sub.code === code) {
          return {
            ...sub,
            attended: status === "present" ? sub.attended + 1 : sub.attended,
            total: sub.total + 1,
          };
        }
        return sub;
      })
    );
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await AttendanceService.getStats();
        if (data.courses?.length) {
          setDynamicSubjects(
            data.courses.map((item) => ({
              name: item.course,
              code: item.course_code || item.course.slice(0, 3).toUpperCase(),
              attended: item.attended,
              total: item.total,
              prof: item.professor || "Faculty",
            }))
          );
        }
      } catch {
        // fallback
      }
    })();
  }, []);

  const totalAttended = dynamicSubjects.reduce((a, b) => a + b.attended, 0);
  const totalClasses = dynamicSubjects.reduce((a, b) => a + b.total, 0);
  const overallPct = Math.round((totalAttended / totalClasses) * 100);

  const gaugeData = [{ value: overallPct, fill: getColor(overallPct) }];

  return (
    <div className="px-4 py-3 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl" style={{ color: "#e8f0fe" }}>
            Attendance
          </h1>
          <p className="text-xs" style={{ color: "#6b8cad" }}>
            Semester 6 · Jan–May 2026
          </p>
        </div>
      </div>

      {/* Overall gauge */}
      <div
        className="rounded-2xl p-4 flex items-center gap-4"
        style={{ background: "#0a1628", border: "1px solid #1e3561" }}
      >
        <div style={{ width: 100, height: 100 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="65%"
              outerRadius="100%"
              data={[{ value: 100, fill: "#1e3561" }, ...gaugeData]}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar dataKey="value" cornerRadius={8} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div
            style={{
              position: "relative",
              top: -66,
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            <p
              style={{
                color: getColor(overallPct),
                fontSize: 20,
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              {overallPct}%
            </p>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-base" style={{ color: "#e8f0fe" }}>
            Overall Attendance
          </p>
          <p className="text-xs mt-1" style={{ color: "#6b8cad" }}>
            {totalAttended} / {totalClasses} classes attended
          </p>
          <div className="flex gap-2 mt-2">
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}
            >
              ↑ 2.3% this week
            </span>
          </div>
          <p className="text-xs mt-2" style={{ color: "#8ba3c7" }}>
            {overallPct >= 75
              ? `You can bunk ${getBunkable(totalAttended, totalClasses)} more classes overall`
              : `Attend ${getNeeded(totalAttended, totalClasses)} more classes to reach 75%`}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex rounded-xl p-1"
        style={{ background: "#0a1628", border: "1px solid #1e3561" }}
      >
        {(["overview", "bunk"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2 rounded-lg text-sm transition-all"
            style={{
              background: activeTab === tab ? "#3b82f6" : "transparent",
              color: activeTab === tab ? "#fff" : "#6b8cad",
            }}
          >
            {tab === "overview" ? "Subject-wise" : "Bunk Analyzer 🧠"}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-3">
          {dynamicSubjects.map((sub) => {
            const pct = Math.round((sub.attended / sub.total) * 100);
            const color = getColor(pct);
            const bunkable = getBunkable(sub.attended, sub.total);
            const needed = getNeeded(sub.attended, sub.total);
            return (
              <div
                key={sub.code}
                className="rounded-2xl p-3"
                style={{ background: "#0a1628", border: "1px solid #1e3561" }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm" style={{ color: "#e8f0fe" }}>
                      {sub.name}
                    </p>
                    <p className="text-xs" style={{ color: "#6b8cad" }}>
                      {sub.code} · {sub.prof}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className="text-sm px-2 py-0.5 rounded-full"
                      style={{ background: `${color}22`, color }}
                    >
                      {pct}%
                    </span>
                    <p className="text-[10px] mt-0.5" style={{ color: "#6b8cad" }}>
                      {sub.attended}/{sub.total}
                    </p>
                  </div>
                </div>
                <div
                  className="h-1.5 rounded-full mt-2 overflow-hidden"
                  style={{ background: "#1e3561" }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
                {pct < 75 && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <AlertTriangle size={11} style={{ color: "#ef4444" }} />
                    <p className="text-[10px]" style={{ color: "#ef4444" }}>
                      Attend {needed} more classes to reach 75%
                    </p>
                  </div>
                )}
                
                <div className="flex justify-between items-center mt-3 pt-2" style={{ borderTop: "1px dashed #1e3561" }}>
                  <p className="text-[10px]" style={{ color: "#6b8cad" }}>Log Class:</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleLogClass(sub.code, "present")}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all active:scale-95"
                      style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}
                    >
                      ✅ Attended
                    </button>
                    <button
                      onClick={() => handleLogClass(sub.code, "absent")}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all active:scale-95"
                      style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}
                    >
                      ❌ Bunked
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "bunk" && (
        <div className="space-y-3">
          <div
            className="rounded-2xl p-3 flex items-start gap-2"
            style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}
          >
            <Zap size={14} style={{ color: "#3b82f6" }} />
            <p className="text-xs" style={{ color: "#8ba3c7" }}>
              AI-powered bunk advisor. These are safe skips based on your current attendance and upcoming classes.
            </p>
          </div>

          {dynamicSubjects.map((sub) => {
            const pct = Math.round((sub.attended / sub.total) * 100);
            const color = getColor(pct);
            const bunkable = getBunkable(sub.attended, sub.total);
            const needed = getNeeded(sub.attended, sub.total);
            const canBunk = bunkable > 0;
            return (
              <div
                key={sub.code}
                className="rounded-2xl p-3"
                style={{ background: "#0a1628", border: "1px solid #1e3561" }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm" style={{ color: "#e8f0fe" }}>
                      {sub.name}
                    </p>
                    <p className="text-xs" style={{ color: "#6b8cad" }}>
                      Current: {pct}%
                    </p>
                  </div>
                  {canBunk ? (
                    <div className="text-right">
                      <div
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl"
                        style={{ background: "rgba(34,197,94,0.15)" }}
                      >
                        <CheckCircle size={12} style={{ color: "#22c55e" }} />
                        <span className="text-xs" style={{ color: "#22c55e" }}>
                          Skip {bunkable}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl"
                      style={{ background: "rgba(239,68,68,0.15)" }}
                    >
                      <TrendingDown size={12} style={{ color: "#ef4444" }} />
                      <span className="text-xs" style={{ color: "#ef4444" }}>
                        Need {needed}
                      </span>
                    </div>
                  )}
                </div>
                <div
                  className="h-1.5 rounded-full mt-2 overflow-hidden"
                  style={{ background: "#1e3561" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <p className="text-[10px]" style={{ color: "#6b8cad" }}>
                    {sub.attended}/{sub.total} attended
                  </p>
                  <p className="text-[10px]" style={{ color: pct >= 75 ? "#22c55e" : "#ef4444" }}>
                    After skip: {bunkable > 0 ? Math.round(((sub.attended) / (sub.total + 1)) * 100) : pct}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="h-2" />
    </div>
  );
}
