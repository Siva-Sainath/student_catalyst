import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Calendar,
  Clock,
  Users,
  BookOpen,
  Briefcase,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowRight,
  Sun,
  Moon,
  Thermometer,
  Droplets,
} from "lucide-react";
import MvpService from "../services/mvpService";

interface QuickAction {
  icon: any;
  label: string;
  path: string;
  color: string;
  bgColor: string;
}

interface ScheduleItem {
  time: string;
  subject: string;
  professor: string;
  room: string;
  type: "lecture" | "lab" | "tutorial";
}

interface Assignment {
  id: number;
  title: string;
  subject: string;
  due: string;
  daysLeft: number;
  priority: "high" | "medium" | "low";
  status: "pending" | "done";
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: Calendar,
    label: "Schedule",
    path: "/schedule",
    color: "var(--primary-500)",
    bgColor: "rgba(59, 130, 246, 0.1)",
  },
  {
    icon: Users,
    label: "Attendance",
    path: "/attendance",
    color: "var(--secondary-500)",
    bgColor: "rgba(139, 92, 246, 0.1)",
  },
  {
    icon: BookOpen,
    label: "Assignments",
    path: "/assignments",
    color: "var(--success-500)",
    bgColor: "rgba(16, 185, 129, 0.1)",
  },
  {
    icon: Briefcase,
    label: "Jobs",
    path: "/jobs",
    color: "var(--warning-500)",
    bgColor: "rgba(245, 158, 11, 0.1)",
  },
];

const TODAY_SCHEDULE: ScheduleItem[] = [
  { time: "9:00 AM", subject: "Data Structures", professor: "Dr. Smith", room: "Room 201", type: "lecture" },
  { time: "10:30 AM", subject: "Operating Systems", professor: "Prof. Johnson", room: "Room 105", type: "lecture" },
  { time: "1:00 PM", subject: "Computer Networks", professor: "Dr. Lee", room: "Lab 301", type: "lab" },
  { time: "2:30 PM", subject: "DBMS", professor: "Prof. Williams", room: "Room 205", type: "lecture" },
];

const UPCOMING_ASSIGNMENTS: Assignment[] = [
  { id: 1, title: "DSA Project", subject: "Data Structures", due: "Jun 15", daysLeft: 7, priority: "high", status: "pending" },
  { id: 2, title: "OS Lab Report", subject: "Operating Systems", due: "Jun 10", daysLeft: 2, priority: "high", status: "pending" },
  { id: 3, title: "CN Quiz Prep", subject: "Computer Networks", due: "Jun 12", daysLeft: 4, priority: "medium", status: "pending" },
];

export function Dashboard() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const session = await MvpService.ensureSession();
        const data = await MvpService.getDashboard();
        setUserData(data);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setError("Failed to load data. Using fallback.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getAttendanceStatus = (percentage: number) => {
    if (percentage >= 75) return { status: "Safe", icon: CheckCircle, color: "var(--success-500)" };
    if (percentage >= 65) return { status: "Warning", icon: AlertTriangle, color: "var(--warning-500)" };
    return { status: "Danger", icon: XCircle, color: "var(--danger-500)" };
  };

  const overallAttendance = 80.75;
  const attendanceStatus = getAttendanceStatus(overallAttendance);

  // Weather data (fallback)
  const weather = {
    temperature: 28,
    condition: "Partly Cloudy",
    humidity: 65,
    icon: Thermometer,
  };

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
              Dashboard
            </h1>
            <p className="text-sm mt-1 text-secondary">
              Welcome back! Here's your overview.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-tertiary border border-primary">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span className="text-xs text-secondary">Online</span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div
            className="rounded-xl p-3 bg-tertiary border border-primary"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(59, 130, 246, 0.1)" }}>
                <Calendar size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-xs text-secondary">Today's Classes</p>
                <p className="text-lg font-semibold text-primary">4</p>
              </div>
            </div>
          </div>
          
          <div
            className="rounded-xl p-3 bg-tertiary border border-primary"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(139, 92, 246, 0.1)" }}>
                <BookOpen size={16} className="text-secondary" />
              </div>
              <div>
                <p className="text-xs text-secondary">Assignments Due</p>
                <p className="text-lg font-semibold text-primary">3</p>
              </div>
            </div>
          </div>
          
          <div
            className="rounded-xl p-3 bg-tertiary border border-primary"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(16, 185, 129, 0.1)" }}>
                <TrendingUp size={16} className="text-success" />
              </div>
              <div>
                <p className="text-xs text-secondary">Overall Attendance</p>
                <p className="text-lg font-semibold text-primary">{overallAttendance}%</p>
              </div>
            </div>
          </div>
          
          <div
            className="rounded-xl p-3 bg-tertiary border border-primary"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(245, 158, 11, 0.1)" }}>
                <Briefcase size={16} className="text-warning" />
              </div>
              <div>
                <p className="text-xs text-secondary">New Jobs</p>
                <p className="text-lg font-semibold text-primary">12</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Attendance Status */}
        <div
          className="rounded-xl p-4 bg-secondary border border-primary"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-primary">
                Attendance Status
              </h2>
              <p className="text-xs mt-1 text-secondary">
                Your current attendance across all subjects
              </p>
            </div>
            <div className="flex items-center gap-1">
              {attendanceStatus.icon && (
                <attendanceStatus.icon size={16} style={{ color: attendanceStatus.color }} />
              )}
              <span className="text-xs font-medium" style={{ color: attendanceStatus.color }}>
                {attendanceStatus.status}
              </span>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-2xl font-bold text-primary">
                  {overallAttendance}%
                </div>
                <div className="text-xs text-secondary">
                  Overall Attendance
                </div>
              </div>
              <div className="flex-1">
                <div className="w-20 h-20 mx-auto">
                  <svg className="w-full h-full" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="var(--border-primary)"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="var(--primary-500)"
                      strokeWidth="3"
                      strokeDasharray={`${2 * Math.PI * 15.9155 * (overallAttendance / 100)}, ${2 * Math.PI * 15.9155}`}
                      strokeLinecap="round"
                      transform="rotate(-90 18 18)"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Schedule */}
        <div
          className="rounded-xl p-4 bg-secondary border border-primary"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-primary">
              Today's Schedule
            </h2>
            <button
              onClick={() => navigate("/schedule")}
              className="text-xs flex items-center gap-1 text-primary"
            >
              View All
              <ArrowRight size={12} />
            </button>
          </div>
          
          <div className="mt-4 space-y-3">
            {TODAY_SCHEDULE.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-2 rounded-lg bg-card border border-primary"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(59, 130, 246, 0.1)" }}>
                  <Clock size={14} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary">
                    {item.subject}
                  </p>
                  <p className="text-xs text-secondary">
                    {item.time} &middot; {item.room}
                  </p>
                </div>
                <div className="text-xs text-secondary">
                  {item.professor}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Assignments */}
        <div
          className="rounded-xl p-4 bg-secondary border border-primary"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-primary">
              Upcoming Assignments
            </h2>
            <button
              onClick={() => navigate("/assignments")}
              className="text-xs flex items-center gap-1 text-success"
            >
              View All
              <ArrowRight size={12} />
            </button>
          </div>
          
          <div className="mt-4 space-y-3">
            {UPCOMING_ASSIGNMENTS.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-card border border-primary"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{
                  background: assignment.priority === "high" ? "rgba(239, 68, 68, 0.1)" : 
                               assignment.priority === "medium" ? "rgba(245, 158, 11, 0.1)" : 
                               "rgba(16, 185, 129, 0.1)"
                }}>
                  <BookOpen size={14} style={{
                    color: assignment.priority === "high" ? "var(--danger-500)" : 
                           assignment.priority === "medium" ? "var(--warning-500)" : 
                           "var(--success-500)"
                  }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary">
                    {assignment.title}
                  </p>
                  <p className="text-xs text-secondary">
                    {assignment.subject} &middot; Due: {assignment.due}
                  </p>
                </div>
                <div className="text-xs" style={{
                  color: assignment.daysLeft <= 2 ? "var(--danger-500)" : 
                         assignment.daysLeft <= 4 ? "var(--warning-500)" : "var(--success-500)"
                }}>
                  {assignment.daysLeft} days left
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div
          className="rounded-xl p-4 bg-secondary border border-primary"
        >
          <h2 className="text-sm font-medium mb-3 text-primary">
            Quick Actions
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center gap-2 p-3 rounded-lg transition-all hover:bg-blue-500/10 active:scale-95 bg-card border border-primary"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: action.bgColor }}>
                  <action.icon size={16} style={{ color: action.color }} />
                </div>
                <span className="text-xs text-secondary">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Weather Widget */}
        <div
          className="rounded-xl p-4 bg-secondary border border-primary"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(59, 130, 246, 0.1)" }}>
                {weather.icon && <weather.icon size={24} className="text-primary" />}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-primary">
                  {weather.temperature}&deg;C
                </h3>
                <p className="text-xs text-secondary">
                  {weather.condition}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-secondary">
                Humidity: {weather.humidity}%
              </p>
              <p className="text-xs mt-1 text-muted">
                VIT Campus
              </p>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-danger-900/20 border border-warning-500/30">
            <AlertTriangle size={16} className="text-warning" />
            <p className="text-sm text-warning">{error}</p>
          </div>
        )}

        {/* Loading */}
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
