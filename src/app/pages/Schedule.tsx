import { useEffect, useState } from "react";
import { MapPin, Clock, AlertCircle, BookOpen, Zap } from "lucide-react";
import MvpService from "../services/mvpService";

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
    { subject: "Data Structures", time: "09:00", end: "10:00", room: "A201", prof: "Dr. Krishnan", type: "Lecture", color: "var(--primary-500)" },
    { subject: "Operating Systems", time: "11:00", end: "12:00", room: "B105", prof: "Prof. Mehta", type: "Lecture", color: "var(--secondary-500)" },
    { subject: "DBMS Lab", time: "14:00", end: "17:00", room: "Lab 2", prof: "Dr. Priya", type: "Lab", color: "var(--success-500)" },
  ],
  Tue: [
    { subject: "Computer Networks", time: "09:00", end: "10:00", room: "C301", prof: "Dr. Rajan", type: "Lecture", color: "var(--primary-400)" },
    { subject: "Software Engineering", time: "11:00", end: "12:00", room: "A301", prof: "Prof. Anand", type: "Lecture", color: "var(--warning-500)" },
    { subject: "DBMS", time: "14:00", end: "15:00", room: "B201", prof: "Dr. Priya", type: "Lecture", color: "var(--danger-400)" },
  ],
  Wed: [
    { subject: "Data Structures", time: "09:00", end: "10:00", room: "A201", prof: "Dr. Krishnan", type: "Lecture", color: "var(--primary-500)" },
    { subject: "Operating Systems", time: "11:00", end: "12:00", room: "B105", prof: "Prof. Mehta", type: "Lecture", color: "var(--secondary-500)" },
    { subject: "Networks Lab", time: "14:00", end: "17:00", room: "Lab 3", prof: "Dr. Rajan", type: "Lab", color: "var(--primary-400)" },
  ],
  Thu: [
    { subject: "Computer Networks", time: "09:00", end: "10:00", room: "C301", prof: "Dr. Rajan", type: "Lecture", color: "var(--primary-400)" },
    { subject: "DBMS", time: "11:00", end: "12:00", room: "B201", prof: "Dr. Priya", type: "Lecture", color: "var(--danger-400)" },
    { subject: "Software Engineering", time: "14:00", end: "15:00", room: "A301", prof: "Prof. Anand", type: "Lecture", color: "var(--warning-500)" },
  ],
  Fri: [
    { subject: "Data Structures", time: "09:00", end: "10:00", room: "A201", prof: "Dr. Krishnan", type: "Lecture", color: "var(--primary-500)" },
    { subject: "Operating Systems", time: "11:00", end: "12:00", room: "B105", prof: "Prof. Mehta", type: "Lecture", color: "var(--secondary-500)" },
  ],
  Sat: [],
};

const exams = [
  { subject: "Data Structures — CAT 2", date: "April 8", daysLeft: 13, syllabus: "Graphs, Dynamic Programming", color: "var(--primary-500)" },
  { subject: "Operating Systems — CAT 2", date: "April 10", daysLeft: 15, syllabus: "Memory Mgmt, File Systems", color: "var(--secondary-500)" },
  { subject: "Computer Networks — CAT 2", date: "April 12", daysLeft: 17, syllabus: "Transport Layer, Routing", color: "var(--primary-400)" },
  { subject: "DBMS — FAT", date: "May 3", daysLeft: 38, syllabus: "Full syllabus", color: "var(--danger-400)" },
];

export function Schedule() {
  const [selectedDay, setSelectedDay] = useState(todayIndex);
  const [tab, setTab] = useState<"timetable" | "exams">("timetable");
  const [dynamicWeek, setDynamicWeek] = useState<typeof weekSchedule | null>(null);
  const [addingClass, setAddingClass] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await MvpService.getSchedule();
        const mapped: Record<string, any[]> = {};
        for (const item of data.week || []) {
          mapped[item.day] = (item.classes || []).map((cls: any) => ({
            subject: cls.subject,
            time: cls.start_time,
            end: cls.end_time,
            room: cls.room,
            prof: cls.faculty,
            type: "Lecture",
            color: cls.status === "cancelled" ? "var(--danger-500)" : "var(--primary-500)",
          }));
        }
        setDynamicWeek(mapped as typeof weekSchedule);
      } catch {
        // fallback to static schedule
      }
    })();
  }, []);

  const currentDayKey = days[selectedDay];
  const classes = (dynamicWeek || weekSchedule)[currentDayKey] || [];

  const addStudyBlock = async () => {
    setAddingClass(true);
    try {
      const now = new Date();
      const currentDay = days[selectedDay];
      const currentDate = now.toISOString().slice(0, 10);
      await MvpService.createSchedule({
        day: currentDay,
        date: currentDate,
        subject: "Self Study Block",
        start_time: "18:00",
        end_time: "19:00",
        room: "Library",
        faculty: "Self",
      });
      const data = await MvpService.getSchedule();
      const mapped: Record<string, any[]> = {};
      for (const item of data.week || []) {
        mapped[item.day] = (item.classes || []).map((cls: any) => ({
          subject: cls.subject,
          time: cls.start_time,
          end: cls.end_time,
          room: cls.room,
          prof: cls.faculty,
          type: "Lecture",
          color: cls.status === "cancelled" ? "var(--danger-500)" : "var(--primary-500)",
        }));
      }
      setDynamicWeek(mapped as typeof weekSchedule);
    } finally {
      setAddingClass(false);
    }
  };

  return (
    <div className="px-4 py-3 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl text-primary">
          Schedule
        </h1>
        <p className="text-xs text-secondary">
          March 2026 &middot; Semester 6
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
                background: isSelected ? "var(--primary-500)" : "var(--bg-hover)",
                border: `1px solid ${isSelected ? "var(--primary-500)" : isToday ? "var(--primary-500)" : "var(--border-primary)"}`,
              }}
            >
              <span
                className="text-[10px]"
                style={{
                  color: isSelected ? "var(--primary-200)" : "var(--text-muted)"
                }}
              >
                {day}
              </span>
              <span
                className="text-sm"
                style={{
                  color: isSelected ? "var(--neutral-50)" : isToday ? "var(--primary-500)" : "var(--text-primary)"
                }}
              >
                {dates[i]}
              </span>
              {isToday && (
                <div
                  className="w-1 h-1 rounded-full"
                  style={{
                    background: isSelected ? "var(--neutral-50)" : "var(--primary-500)"
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tabs */}
      <div
        className="flex rounded-xl p-1 bg-secondary border border-primary"
      >
        {(["timetable", "exams"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-sm transition-all"
            style={{
              background: tab === t ? "var(--primary-500)" : "transparent",
              color: tab === t ? "var(--neutral-50)" : "var(--text-muted)",
            }}
          >
            {t === "timetable" ? "Timetable" : "Exams 📝"}
          </button>
        ))}
      </div>
      
      <button
        onClick={addStudyBlock}
        className="w-full rounded-xl py-2 text-xs bg-tertiary border border-primary text-secondary"
      >
        {addingClass ? "Adding..." : "Add Evening Study Block"}
      </button>

      {tab === "timetable" && (
        <div className="space-y-3">
          {classes.length === 0 ? (
            <div
              className="rounded-2xl p-8 flex flex-col items-center gap-2 bg-secondary border border-primary"
            >
              <span className="text-3xl">🎉</span>
              <p className="text-sm text-primary">
                No classes on Saturday!
              </p>
              <p className="text-xs text-muted">
                Time to catch up on assignments or rest
              </p>
            </div>
          ) : (
            classes.map((cls, i) => (
              <div
                key={i}
                className="rounded-2xl overflow-hidden bg-secondary border border-primary"
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
                        <p className="text-sm text-primary">
                          {cls.subject}
                        </p>
                        <p className="text-xs mt-0.5 text-muted">
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
                        <Clock size={11} className="text-muted" />
                        <span className="text-[11px] text-secondary">
                          {cls.time} &ndash; {cls.end}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin size={11} className="text-muted" />
                        <span className="text-[11px] text-secondary">
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
              style={{
                background: "rgba(59,130,246,0.08)",
                border: "1px solid rgba(59,130,246,0.2)"
              }}
            >
              <Zap size={13} className="text-primary" />
              <div>
                <p className="text-xs text-primary">
                  AI Scheduling Insight
                </p>
                <p className="text-xs mt-0.5 text-secondary">
                  You have a 2-hour gap between 12&ndash;2 PM today. Good time to revise Networks before the afternoon class.
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
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)"
            }}
          >
            <AlertCircle size={13} className="text-danger" />
            <p className="text-xs text-danger">
              CAT 2 exams begin in 13 days. Start revising now!
            </p>
          </div>

          {exams.map((exam) => (
            <div
              key={exam.subject}
              className="rounded-2xl p-3 bg-secondary border border-primary"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-sm text-primary">
                    {exam.subject}
                  </p>
                  <p className="text-xs mt-0.5 text-muted">
                    Syllabus: {exam.syllabus}
                  </p>
                </div>
                <div
                  className="text-xs px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    background: `${exam.color}22`,
                    color: exam.color
                  }}
                >
                  {exam.daysLeft}d left
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <Clock size={11} className="text-muted" />
                <span className="text-[11px] text-secondary">
                  {exam.date}
                </span>
              </div>
              <div
                className="h-1 rounded-full mt-2 overflow-hidden border-primary"
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(10, 100 - (exam.daysLeft / 40) * 100)}%`,
                    background: exam.color,
                  }}
                />
              </div>
              <p className="text-[10px] mt-1 text-muted">
                Preparation urgency
              </p>
            </div>
          ))}

          {/* Study plan */}
          <div
            className="rounded-2xl p-3"
            style={{
              background: "rgba(59,130,246,0.08)",
              border: "1px solid rgba(59,130,246,0.2)"
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={13} className="text-primary" />
              <p className="text-xs text-primary">
                AI Study Plan
              </p>
            </div>
            <div className="space-y-1.5">
              {[
                { day: "Today&ndash;Tomorrow", task: "Complete DSA Graph notes + 2 practice problems" },
                { day: "Fri&ndash;Sat", task: "OS Memory Management revision + previous year Qs" },
                { day: "Next Week", task: "Networks mock test + DBMS query practice" },
              ].map((item, i) => (
                <div key={i} className="flex gap-2">
                  <div
                    className="w-1 rounded-full shrink-0 mt-1"
                    style={{
                      height: 14,
                      background: "var(--primary-500)",
                      opacity: 1 - i * 0.2
                    }}
                  />
                  <div>
                    <p className="text-[10px] text-primary">
                      {item.day}
                    </p>
                    <p className="text-xs text-secondary">
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
