import { useState } from "react";
import { MapPin, Clock, AlertCircle, BookOpen, Zap } from "lucide-react";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dates = [23, 24, 25, 26, 27, 28];
const todayIndex = 3; // Thursday

const weekSchedule: Record<string, Array<{
  subject: string;
  time: string;
  end: string;
  room: string;
  prof: string;
  type: string;
  color: string;
}>> = {
  Mon: [
    { subject: "Data Structures", time: "09:00", end: "10:00", room: "A201", prof: "Dr. Krishnan", type: "Lecture", color: "#3b82f6" },
    { subject: "Operating Systems", time: "11:00", end: "12:00", room: "B105", prof: "Prof. Mehta", type: "Lecture", color: "#8b5cf6" },
    { subject: "DBMS Lab", time: "14:00", end: "17:00", room: "Lab 2", prof: "Dr. Priya", type: "Lab", color: "#22c55e" },
  ],
  Tue: [
    { subject: "Computer Networks", time: "09:00", end: "10:00", room: "C301", prof: "Dr. Rajan", type: "Lecture", color: "#06b6d4" },
    { subject: "Software Engineering", time: "11:00", end: "12:00", room: "A301", prof: "Prof. Anand", type: "Lecture", color: "#f59e0b" },
    { subject: "DBMS", time: "14:00", end: "15:00", room: "B201", prof: "Dr. Priya", type: "Lecture", color: "#ec4899" },
  ],
  Wed: [
    { subject: "Data Structures", time: "09:00", end: "10:00", room: "A201", prof: "Dr. Krishnan", type: "Lecture", color: "#3b82f6" },
    { subject: "Operating Systems", time: "11:00", end: "12:00", room: "B105", prof: "Prof. Mehta", type: "Lecture", color: "#8b5cf6" },
    { subject: "Networks Lab", time: "14:00", end: "17:00", room: "Lab 3", prof: "Dr. Rajan", type: "Lab", color: "#06b6d4" },
  ],
  Thu: [
    { subject: "Computer Networks", time: "09:00", end: "10:00", room: "C301", prof: "Dr. Rajan", type: "Lecture", color: "#06b6d4" },
    { subject: "DBMS", time: "11:00", end: "12:00", room: "B201", prof: "Dr. Priya", type: "Lecture", color: "#ec4899" },
    { subject: "Software Engineering", time: "14:00", end: "15:00", room: "A301", prof: "Prof. Anand", type: "Lecture", color: "#f59e0b" },
  ],
  Fri: [
    { subject: "Data Structures", time: "09:00", end: "10:00", room: "A201", prof: "Dr. Krishnan", type: "Lecture", color: "#3b82f6" },
    { subject: "Operating Systems", time: "11:00", end: "12:00", room: "B105", prof: "Prof. Mehta", type: "Lecture", color: "#8b5cf6" },
  ],
  Sat: [],
};

const exams = [
  { subject: "Data Structures — CAT 2", date: "April 8", daysLeft: 13, syllabus: "Graphs, Dynamic Programming", color: "#3b82f6" },
  { subject: "Operating Systems — CAT 2", date: "April 10", daysLeft: 15, syllabus: "Memory Mgmt, File Systems", color: "#8b5cf6" },
  { subject: "Computer Networks — CAT 2", date: "April 12", daysLeft: 17, syllabus: "Transport Layer, Routing", color: "#06b6d4" },
  { subject: "DBMS — FAT", date: "May 3", daysLeft: 38, syllabus: "Full syllabus", color: "#ec4899" },
];

export function Schedule() {
  const [selectedDay, setSelectedDay] = useState(todayIndex);
  const [tab, setTab] = useState<"timetable" | "exams">("timetable");

  const currentDayKey = days[selectedDay];
  const classes = weekSchedule[currentDayKey] || [];

  return (
    <div className="px-4 py-3 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl" style={{ color: "#e8f0fe" }}>
          Schedule
        </h1>
        <p className="text-xs" style={{ color: "#6b8cad" }}>
          March 2026 · Semester 6
        </p>
      </div>

      {/* Day selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {days.map((day, i) => {
          const isSelected = i === selectedDay;
          const isToday = i === todayIndex;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(i)}
              className="flex flex-col items-center gap-1 rounded-2xl py-2.5 transition-all shrink-0"
              style={{
                minWidth: 52,
                background: isSelected ? "#3b82f6" : "#0a1628",
                border: `1px solid ${isSelected ? "#3b82f6" : isToday ? "#3b82f6" : "#1e3561"}`,
              }}
            >
              <span
                className="text-[10px]"
                style={{ color: isSelected ? "#bfdbfe" : "#6b8cad" }}
              >
                {day}
              </span>
              <span
                className="text-sm"
                style={{ color: isSelected ? "#fff" : isToday ? "#3b82f6" : "#e8f0fe" }}
              >
                {dates[i]}
              </span>
              {isToday && (
                <div
                  className="w-1 h-1 rounded-full"
                  style={{ background: isSelected ? "#fff" : "#3b82f6" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tabs */}
      <div
        className="flex rounded-xl p-1"
        style={{ background: "#0a1628", border: "1px solid #1e3561" }}
      >
        {(["timetable", "exams"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-sm transition-all"
            style={{
              background: tab === t ? "#3b82f6" : "transparent",
              color: tab === t ? "#fff" : "#6b8cad",
            }}
          >
            {t === "timetable" ? "Timetable" : "Exams 📝"}
          </button>
        ))}
      </div>

      {tab === "timetable" && (
        <div className="space-y-3">
          {classes.length === 0 ? (
            <div
              className="rounded-2xl p-8 flex flex-col items-center gap-2"
              style={{ background: "#0a1628", border: "1px solid #1e3561" }}
            >
              <span className="text-3xl">🎉</span>
              <p className="text-sm" style={{ color: "#e8f0fe" }}>
                No classes on Saturday!
              </p>
              <p className="text-xs" style={{ color: "#6b8cad" }}>
                Time to catch up on assignments or rest
              </p>
            </div>
          ) : (
            classes.map((cls, i) => (
              <div
                key={i}
                className="rounded-2xl overflow-hidden"
                style={{ background: "#0a1628", border: "1px solid #1e3561" }}
              >
                <div className="flex">
                  {/* Color indicator */}
                  <div
                    className="w-1 shrink-0"
                    style={{ background: cls.color }}
                  />
                  <div className="flex-1 p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm" style={{ color: "#e8f0fe" }}>
                          {cls.subject}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "#6b8cad" }}>
                          {cls.prof}
                        </p>
                      </div>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full shrink-0"
                        style={{
                          background: `${cls.color}22`,
                          color: cls.color,
                        }}
                      >
                        {cls.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1">
                        <Clock size={11} style={{ color: "#6b8cad" }} />
                        <span className="text-[11px]" style={{ color: "#8ba3c7" }}>
                          {cls.time} – {cls.end}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin size={11} style={{ color: "#6b8cad" }} />
                        <span className="text-[11px]" style={{ color: "#8ba3c7" }}>
                          {cls.room}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* AI suggestion */}
          {classes.length > 0 && (
            <div
              className="rounded-2xl p-3 flex items-start gap-2"
              style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}
            >
              <Zap size={13} style={{ color: "#3b82f6" }} />
              <div>
                <p className="text-xs" style={{ color: "#60a5fa" }}>
                  AI Scheduling Insight
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#8ba3c7" }}>
                  You have a 2-hour gap between 12–2 PM today. Good time to revise Networks before the afternoon class.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "exams" && (
        <div className="space-y-3">
          <div
            className="rounded-2xl p-3 flex items-start gap-2"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <AlertCircle size={13} style={{ color: "#ef4444" }} />
            <p className="text-xs" style={{ color: "#fca5a5" }}>
              CAT 2 exams begin in 13 days. Start revising now!
            </p>
          </div>

          {exams.map((exam) => (
            <div
              key={exam.subject}
              className="rounded-2xl p-3"
              style={{ background: "#0a1628", border: "1px solid #1e3561" }}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-sm" style={{ color: "#e8f0fe" }}>
                    {exam.subject}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#6b8cad" }}>
                    Syllabus: {exam.syllabus}
                  </p>
                </div>
                <div
                  className="text-xs px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: `${exam.color}22`, color: exam.color }}
                >
                  {exam.daysLeft}d left
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <Clock size={11} style={{ color: "#6b8cad" }} />
                <span className="text-[11px]" style={{ color: "#8ba3c7" }}>
                  {exam.date}
                </span>
              </div>
              <div
                className="h-1 rounded-full mt-2 overflow-hidden"
                style={{ background: "#1e3561" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(10, 100 - (exam.daysLeft / 40) * 100)}%`,
                    background: exam.color,
                  }}
                />
              </div>
              <p className="text-[10px] mt-1" style={{ color: "#4a6585" }}>
                Preparation urgency
              </p>
            </div>
          ))}

          {/* Study plan */}
          <div
            className="rounded-2xl p-3"
            style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={13} style={{ color: "#3b82f6" }} />
              <p className="text-xs" style={{ color: "#60a5fa" }}>
                AI Study Plan
              </p>
            </div>
            <div className="space-y-1.5">
              {[
                { day: "Today–Tomorrow", task: "Complete DSA Graph notes + 2 practice problems" },
                { day: "Fri–Sat", task: "OS Memory Management revision + previous year Qs" },
                { day: "Next Week", task: "Networks mock test + DBMS query practice" },
              ].map((item, i) => (
                <div key={i} className="flex gap-2">
                  <div
                    className="w-1 rounded-full shrink-0 mt-1"
                    style={{ height: 14, background: "#3b82f6", opacity: 1 - i * 0.2 }}
                  />
                  <div>
                    <p className="text-[10px]" style={{ color: "#3b82f6" }}>
                      {item.day}
                    </p>
                    <p className="text-xs" style={{ color: "#8ba3c7" }}>
                      {item.task}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="h-2" />
    </div>
  );
}
