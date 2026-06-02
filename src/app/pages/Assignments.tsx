import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Check,
  Clock,
  AlertTriangle,
  Flag,
  X,
  Search,
  Filter,
  ChevronDown,
  Calendar,
  Tag,
} from "lucide-react";
import MvpService from "../services/mvpService";

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

const PRIORITY_COLORS: Record<Priority, { color: string; bg: string }> = {
  high: { color: "var(--danger-500)", bg: "rgba(239, 68, 68, 0.1)" },
  medium: { color: "var(--warning-500)", bg: "rgba(245, 158, 11, 0.1)" },
  low: { color: "var(--success-500)", bg: "rgba(16, 185, 129, 0.1)" },
};

const STATUS_COLORS: Record<Status, { color: string; bg: string }> = {
  pending: { color: "var(--warning-500)", bg: "rgba(245, 158, 11, 0.1)" },
  done: { color: "var(--success-500)", bg: "rgba(16, 185, 129, 0.1)" },
};

const TASK_TYPES = ["All", "Task", "Project", "Exam Prep", "Lab"];
const PRIORITY_FILTERS = ["All", "High", "Medium", "Low"];
const STATUS_FILTERS = ["All", "Pending", "Done"];

export function Assignments() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>(["loading"]);
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const [newType, setNewType] = useState("Task");
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Seed data
  const seedTasks: Task[] = [
    {
      id: 1,
      title: "DSA Project Implementation",
      subject: "Data Structures",
      due: "Jun 15",
      daysLeft: 7,
      priority: "high",
      status: "pending",
      type: "Project",
    },
    {
      id: 2,
      title: "OS Lab Report",
      subject: "Operating Systems",
      due: "Jun 10",
      daysLeft: 2,
      priority: "high",
      status: "pending",
      type: "Lab",
    },
    {
      id: 3,
      title: "CN Quiz Preparation",
      subject: "Computer Networks",
      due: "Jun 12",
      daysLeft: 4,
      priority: "medium",
      status: "pending",
      type: "Exam Prep",
    },
    {
      id: 4,
      title: "DBMS Assignment",
      subject: "Database Management",
      due: "Jun 20",
      daysLeft: 12,
      priority: "low",
      status: "pending",
      type: "Task",
    },
    {
      id: 5,
      title: "Algorithms Study",
      subject: "Data Structures",
      due: "Jun 8",
      daysLeft: 0,
      priority: "high",
      status: "pending",
      type: "Exam Prep",
    },
    {
      id: 6,
      title: "Previous Project",
      subject: "Software Engineering",
      due: "May 30",
      daysLeft: -5,
      priority: "medium",
      status: "done",
      type: "Project",
    },
  ];

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const data = await MvpService.getAssignments();
        const mapped: Task[] = (data.assignments || []).map((item: any) => {
          const due = new Date(item.due_at);
          const daysLeft = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return {
            id: item.id,
            title: item.title,
            subject: item.subject,
            due: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            daysLeft,
            priority: item.priority,
            status: item.status === "done" ? "done" : "pending",
            type: item.type || "Task",
          };
        });
        if (mapped.length) {
          setTasks(mapped);
        } else {
          setTasks(seedTasks);
        }
      } catch {
        setTasks(seedTasks);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  const toggle = async (id: number) => {
    const target = tasks.find((t) => t.id === id);
    if (!target) return;
    const nextStatus = target.status === "done" ? "pending" : "done";
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: nextStatus } : t)));
    try {
      await MvpService.updateAssignment(id, { status: nextStatus });
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: target.status } : t)));
    }
  };

  const addTask = async () => {
    if (!newTitle.trim()) return;
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 7);
    const task: Task = {
      id: Date.now(),
      title: newTitle,
      subject: newSubject || "General",
      due: dueAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      daysLeft: 7,
      priority: newPriority,
      status: "pending",
      type: newType,
    };
    setTasks((prev) => [task, ...prev]);
    setNewTitle("");
    setNewSubject("");
    setNewPriority("medium");
    setNewType("Task");
    setShowAdd(false);
    try {
      await MvpService.createAssignment({
        title: task.title,
        subject: task.subject,
        type: task.type.toLowerCase(),
        priority: task.priority,
        due_at: dueAt.toISOString(),
      });
      const refreshed = await MvpService.getAssignments();
      const mapped: Task[] = (refreshed.assignments || []).map((item: any) => {
        const due = new Date(item.due_at);
        return {
          id: item.id,
          title: item.title,
          subject: item.subject,
          due: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          daysLeft: Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          priority: item.priority,
          status: item.status === "done" ? "done" : "pending",
          type: item.type || "Task",
        };
      });
      setTasks(mapped);
    } catch {
      // keep local optimistic add
    }
  };

  const filtered = tasks.filter((t) => {
    if (typeFilter !== "All" && t.type !== typeFilter) return false;
    if (priorityFilter !== "All" && t.priority !== priorityFilter.toLowerCase() as Priority) return false;
    if (statusFilter !== "All" && t.status !== statusFilter.toLowerCase() as Status) return false;
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !t.subject.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const pending = filtered.filter((t) => t.status === "pending");
  const done = filtered.filter((t) => t.status === "done");
  const overdue = pending.filter((t) => t.daysLeft < 0);
  const dueSoon = pending.filter((t) => t.daysLeft >= 0 && t.daysLeft <= 2);

  return (
    <div
      className="flex flex-col h-full bg-primary"
    >
      {/* Header */}
      <div
        className="px-4 py-4 shrink-0 bg-secondary border-b border-primary"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-primary">
              Assignments
            </h1>
            <p className="text-sm mt-1 text-secondary">
              {filtered.length} tasks total &middot; {pending.length} pending
            </p>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg btn-primary"
          >
            <Plus size={16} />
            <span className="text-sm">Add Task</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mt-4">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2 py-1.5 rounded-lg text-sm bg-tertiary border border-primary text-primary"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2 py-1.5 rounded-lg text-sm bg-tertiary border border-primary text-primary"
          >
            {TASK_TYPES.map((t) => (
              <option key={t} value={t} className="text-sm bg-secondary text-primary">
                {t}
              </option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2 py-1.5 rounded-lg text-sm bg-tertiary border border-primary text-primary"
          >
            {PRIORITY_FILTERS.map((p) => (
              <option key={p} value={p} className="text-sm bg-secondary text-primary">
                {p}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1.5 rounded-lg text-sm bg-tertiary border border-primary text-primary"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s} className="text-sm bg-secondary text-primary">
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Add Task Form */}
      {showAdd && (
        <div
          className="px-4 py-3 shrink-0 bg-secondary border-b border-primary"
        >
          <div className="flex items-end gap-2">
            <input
              type="text"
              placeholder="Task title..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg text-sm bg-tertiary border border-primary text-primary"
            />
            <select
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              className="px-2 py-2 rounded-lg text-sm bg-tertiary border border-primary text-primary"
            >
              <option value="" className="text-sm bg-secondary text-muted">Subject</option>
              <option value="Data Structures" className="text-sm bg-secondary text-primary">Data Structures</option>
              <option value="Operating Systems" className="text-sm bg-secondary text-primary">Operating Systems</option>
              <option value="Computer Networks" className="text-sm bg-secondary text-primary">Computer Networks</option>
              <option value="DBMS" className="text-sm bg-secondary text-primary">DBMS</option>
              <option value="General" className="text-sm bg-secondary text-primary">General</option>
            </select>
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as Priority)}
              className="px-2 py-2 rounded-lg text-sm bg-tertiary border border-primary text-primary"
            >
              <option value="high" className="text-sm bg-secondary text-danger">High</option>
              <option value="medium" className="text-sm bg-secondary text-warning">Medium</option>
              <option value="low" className="text-sm bg-secondary text-success">Low</option>
            </select>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="px-2 py-2 rounded-lg text-sm bg-tertiary border border-primary text-primary"
            >
              <option value="Task" className="text-sm bg-secondary text-primary">Task</option>
              <option value="Project" className="text-sm bg-secondary text-primary">Project</option>
              <option value="Exam Prep" className="text-sm bg-secondary text-primary">Exam Prep</option>
              <option value="Lab" className="text-sm bg-secondary text-primary">Lab</option>
            </select>
            <button
              onClick={addTask}
              disabled={!newTitle.trim()}
              className="px-3 py-2 rounded-lg btn-success disabled:opacity-50"
            >
              <span className="text-sm">Add</span>
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-3 py-2 rounded-lg bg-tertiary border border-primary"
            >
              <X size={16} className="text-secondary" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div
            className="rounded-xl p-3 bg-secondary border border-primary"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(239, 68, 68, 0.1)" }}>
                <AlertTriangle size={16} className="text-danger" />
              </div>
              <div>
                <p className="text-xs text-secondary">Overdue</p>
                <p className="text-xl font-semibold text-danger">{overdue.length}</p>
              </div>
            </div>
          </div>
          <div
            className="rounded-xl p-3 bg-secondary border border-primary"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(245, 158, 11, 0.1)" }}>
                <Clock size={16} className="text-warning" />
              </div>
              <div>
                <p className="text-xs text-secondary">Due Soon</p>
                <p className="text-xl font-semibold text-warning">{dueSoon.length}</p>
              </div>
            </div>
          </div>
          <div
            className="rounded-xl p-3 bg-secondary border border-primary"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(16, 185, 129, 0.1)" }}>
                <Check size={16} className="text-success" />
              </div>
              <div>
                <p className="text-xs text-secondary">Completed</p>
                <p className="text-xl font-semibold text-success">{done.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Task Lists */}
        {overdue.length > 0 && (
          <div
            className="rounded-xl p-4 bg-secondary border border-primary"
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-danger" />
              <h2 className="text-sm font-medium text-primary">
                Overdue ({overdue.length})
              </h2>
            </div>
            <div className="space-y-2">
              {overdue.map((t) => (
                <TaskItem key={t.id} task={t} onToggle={toggle} />
              ))}
            </div>
          </div>
        )}

        {dueSoon.length > 0 && (
          <div
            className="rounded-xl p-4 bg-secondary border border-primary"
          >
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} className="text-warning" />
              <h2 className="text-sm font-medium text-primary">
                Due Soon ({dueSoon.length})
              </h2>
            </div>
            <div className="space-y-2">
              {dueSoon.map((t) => (
                <TaskItem key={t.id} task={t} onToggle={toggle} />
              ))}
            </div>
          </div>
        )}

        {pending.filter(t => t.daysLeft > 2).length > 0 && (
          <div
            className="rounded-xl p-4 bg-secondary border border-primary"
          >
            <div className="flex items-center gap-2 mb-3">
              <Flag size={16} className="text-primary" />
              <h2 className="text-sm font-medium text-primary">
                Upcoming ({pending.filter(t => t.daysLeft > 2).length})
              </h2>
            </div>
            <div className="space-y-2">
              {pending.filter(t => t.daysLeft > 2).map((t) => (
                <TaskItem key={t.id} task={t} onToggle={toggle} />
              ))}
            </div>
          </div>
        )}

        {done.length > 0 && (
          <div
            className="rounded-xl p-4 bg-secondary border border-primary"
          >
            <div className="flex items-center gap-2 mb-3">
              <Check size={16} className="text-success" />
              <h2 className="text-sm font-medium text-primary">
                Completed ({done.length})
              </h2>
            </div>
            <div className="space-y-2">
              {done.map((t) => (
                <TaskItem key={t.id} task={t} onToggle={toggle} />
              ))}
            </div>
          </div>
        )}

        {filtered.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <BookOpen size={48} className="text-primary" />
            <p className="text-sm mt-4 text-secondary">
              No tasks found matching your filters
            </p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary"
                  style={{
                    animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}

function TaskItem({ task, onToggle }: { task: Task; onToggle: (id: number) => void }) {
  const priority = PRIORITY_COLORS[task.priority];
  const status = STATUS_COLORS[task.status];

  return (
    <div
      className="flex items-center gap-3 p-2 rounded-lg bg-card border border-primary"
    >
      <button
        onClick={() => onToggle(task.id)}
        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
        style={{
          background: task.status === "done" ? status.bg : "transparent",
          border: task.status === "pending" ? "1px solid var(--primary-500)" : "none",
        }}
      >
        {task.status === "done" ? (
          <Check size={12} style={{ color: status.color }} />
        ) : (
          <div className="w-2 h-2 rounded-full bg-primary" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-primary">
          {task.title}
        </p>
        <p className="text-xs text-secondary">
          {task.subject} &middot; {task.type}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="px-2 py-0.5 rounded-full text-xs" style={{ background: priority.bg, color: priority.color }}>
          {task.priority}
        </div>
        <div className="text-xs" style={{ color: task.daysLeft < 0 ? "var(--danger-500)" : task.daysLeft <= 2 ? "var(--warning-500)" : "var(--success-500)" }}>
          {task.daysLeft < 0 ? `Overdue` : task.daysLeft === 0 ? `Due today` : `${task.daysLeft} days`}
        </div>
        <div className="text-xs text-secondary">
          {task.due}
        </div>
      </div>
    </div>
  );
}
