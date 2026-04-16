import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Plus, Check, Clock, AlertTriangle, Flag, X } from "lucide-react";

type Priority = "high" | "medium" | "low";
type Status = "pending" | "done";

interface Task {
  id: number;
  title: string;
  subject: string;
  due: string;
  daysLeft: number;
  priority: Priority;
  status: Status;
  type: string;
}

const initialTasks: Task[] = [
  { id: 1, title: "Implement AVL Tree in C++", subject: "Data Structures", due: "Mar 27", daysLeft: 1, priority: "high", status: "pending", type: "Coding" },
  { id: 2, title: "DBMS ER Diagram — Assignment 3", subject: "DBMS", due: "Mar 28", daysLeft: 2, priority: "high", status: "pending", type: "Design" },
  { id: 3, title: "OS Semaphore Report", subject: "Operating Systems", due: "Apr 1", daysLeft: 6, priority: "medium", status: "pending", type: "Report" },
  { id: 4, title: "CN Wireshark Lab Report", subject: "Computer Networks", due: "Apr 3", daysLeft: 8, priority: "medium", status: "pending", type: "Lab" },
  { id: 5, title: "SE Project — Requirement Doc", subject: "Software Engineering", due: "Apr 5", daysLeft: 10, priority: "low", status: "pending", type: "Project" },
  { id: 6, title: "DSA Quiz 4 Revision", subject: "Data Structures", due: "Mar 26", daysLeft: 0, priority: "high", status: "done", type: "Study" },
  { id: 7, title: "DBMS Normalization worksheet", subject: "DBMS", due: "Mar 24", daysLeft: -2, priority: "medium", status: "done", type: "Worksheet" },
];

const priorityColors: Record<Priority, { color: string; bg: string; label: string }> = {
  high: { color: "#ef4444", bg: "rgba(239,68,68,0.15)", label: "High" },
  medium: { color: "#f59e0b", bg: "rgba(245,158,11,0.15)", label: "Medium" },
  low: { color: "#22c55e", bg: "rgba(34,197,94,0.15)", label: "Low" },
};

const typeColors: Record<string, string> = {
  Coding: "#3b82f6",
  Design: "#8b5cf6",
  Report: "#06b6d4",
  Lab: "#22c55e",
  Project: "#f59e0b",
  Study: "#f43f5e",
  Worksheet: "#a78bfa",
};

export function Assignments() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("pending");
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("");

  const toggle = (id: number) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: t.status === "done" ? "pending" : "done" } : t
      )
    );
  };

  const filtered = tasks.filter((t) => {
    if (filter === "all") return true;
    return t.status === filter;
  });

  const pending = tasks.filter((t) => t.status === "pending");
  const overdue = pending.filter((t) => t.daysLeft < 0);
  const dueSoon = pending.filter((t) => t.daysLeft >= 0 && t.daysLeft <= 2);

  const addTask = () => {
    if (!newTitle.trim()) return;
    const task: Task = {
      id: Date.now(),
      title: newTitle,
      subject: newSubject || "General",
      due: "Apr 10",
      daysLeft: 15,
      priority: "medium",
      status: "pending",
      type: "Task",
    };
    setTasks((prev) => [task, ...prev]);
    setNewTitle("");
    setNewSubject("");
    setShowAdd(false);
  };

  return (
    <div className="px-4 py-3 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft size={20} style={{ color: "#6b8cad" }} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl" style={{ color: "#e8f0fe" }}>
            Assignments
          </h1>
          <p className="text-xs" style={{ color: "#6b8cad" }}>
            {pending.length} pending · {overdue.length} overdue
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: "#3b82f6" }}
        >
          {showAdd ? <X size={16} style={{ color: "#fff" }} /> : <Plus size={16} style={{ color: "#fff" }} />}
        </button>
      </div>

      {/* Add task form */}
      {showAdd && (
        <div
          className="rounded-2xl p-4 space-y-3"
          style={{ background: "#0a1628", border: "1px solid #3b82f6" }}
        >
          <p className="text-sm" style={{ color: "#e8f0fe" }}>
            New Assignment
          </p>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Assignment title..."
            className="w-full bg-transparent outline-none text-sm rounded-xl px-3 py-2"
            style={{ background: "#0d1f3c", border: "1px solid #1e3561", color: "#e8f0fe" }}
          />
          <input
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder="Subject (e.g. DBMS)..."
            className="w-full bg-transparent outline-none text-sm rounded-xl px-3 py-2"
            style={{ background: "#0d1f3c", border: "1px solid #1e3561", color: "#e8f0fe" }}
          />
          <button
            onClick={addTask}
            className="w-full py-2 rounded-xl text-sm"
            style={{ background: "#3b82f6", color: "#fff" }}
          >
            Add Assignment
          </button>
        </div>
      )}

      {/* Alert banners */}
      {overdue.length > 0 && (
        <div
          className="rounded-xl px-3 py-2 flex items-center gap-2"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}
        >
          <AlertTriangle size={13} style={{ color: "#ef4444" }} />
          <p className="text-xs" style={{ color: "#fca5a5" }}>
            {overdue.length} assignment{overdue.length > 1 ? "s are" : " is"} overdue!
          </p>
        </div>
      )}

      {dueSoon.length > 0 && (
        <div
          className="rounded-xl px-3 py-2 flex items-center gap-2"
          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}
        >
          <Clock size={13} style={{ color: "#f59e0b" }} />
          <p className="text-xs" style={{ color: "#fcd34d" }}>
            {dueSoon.length} assignment{dueSoon.length > 1 ? "s" : ""} due within 2 days!
          </p>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: tasks.length, color: "#e8f0fe" },
          { label: "Pending", value: pending.length, color: "#f59e0b" },
          { label: "Done", value: tasks.filter((t) => t.status === "done").length, color: "#22c55e" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-3 text-center"
            style={{ background: "#0a1628", border: "1px solid #1e3561" }}
          >
            <p className="text-xl" style={{ color: s.color }}>
              {s.value}
            </p>
            <p className="text-xs" style={{ color: "#6b8cad" }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div
        className="flex rounded-xl p-1"
        style={{ background: "#0a1628", border: "1px solid #1e3561" }}
      >
        {(["pending", "all", "done"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="flex-1 py-2 rounded-lg text-xs transition-all"
            style={{
              background: filter === f ? "#3b82f6" : "transparent",
              color: filter === f ? "#fff" : "#6b8cad",
            }}
          >
            {f === "pending" ? "Pending" : f === "done" ? "Done ✓" : "All"}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {filtered.map((task) => {
          const pc = priorityColors[task.priority];
          const tc = typeColors[task.type] || "#6b8cad";
          const isDone = task.status === "done";
          const isOverdue = task.daysLeft < 0 && !isDone;
          return (
            <div
              key={task.id}
              className="rounded-2xl p-3 flex items-start gap-3"
              style={{
                background: isDone ? "rgba(10,22,40,0.5)" : "#0a1628",
                border: `1px solid ${isOverdue ? "rgba(239,68,68,0.3)" : "#1e3561"}`,
                opacity: isDone ? 0.6 : 1,
              }}
            >
              <button
                onClick={() => toggle(task.id)}
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  background: isDone ? "#22c55e" : "transparent",
                  border: `1.5px solid ${isDone ? "#22c55e" : "#3b5270"}`,
                }}
              >
                {isDone && <Check size={10} style={{ color: "#fff" }} />}
              </button>

              <div className="flex-1 min-w-0">
                <p
                  className="text-sm"
                  style={{
                    color: isDone ? "#4a6585" : "#e8f0fe",
                    textDecoration: isDone ? "line-through" : "none",
                  }}
                >
                  {task.title}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#6b8cad" }}>
                  {task.subject}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded-full"
                    style={{ background: pc.bg, color: pc.color }}
                  >
                    <Flag size={7} className="inline mr-0.5" />
                    {pc.label}
                  </span>
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded-full"
                    style={{ background: `${tc}22`, color: tc }}
                  >
                    {task.type}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p
                  className="text-xs"
                  style={{
                    color: isOverdue ? "#ef4444" : task.daysLeft <= 2 ? "#f59e0b" : "#6b8cad",
                  }}
                >
                  {isOverdue
                    ? `${Math.abs(task.daysLeft)}d overdue`
                    : task.daysLeft === 0
                    ? "Due today"
                    : `${task.daysLeft}d left`}
                </p>
                <p className="text-[10px]" style={{ color: "#4a6585" }}>
                  {task.due}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="h-2" />
    </div>
  );
}
