import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  ArrowRight,
  Search,
} from "lucide-react";
import MvpService from "../services/mvpService";

interface SubjectAttendance {
  id: number;
  name: string;
  code: string;
  professor: string;
  totalClasses: number;
  attended: number;
  percentage: number;
  bunks: number;
  safeBunks: number;
  status: "safe" | "warning" | "danger";
}

const STATUS_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  safe: { icon: CheckCircle, color: "var(--success-500)", bg: "rgba(16, 185, 129, 0.1)", label: "Safe" },
  warning: { icon: AlertTriangle, color: "var(--warning-500)", bg: "rgba(245, 158, 11, 0.1)", label: "Warning" },
  danger: { icon: XCircle, color: "var(--danger-500)", bg: "rgba(239, 68, 68, 0.1)", label: "Danger" },
};

const SEED_DATA: SubjectAttendance[] = [
  {
    id: 1,
    name: "Data Structures",
    code: "CS201",
    professor: "Dr. Smith",
    totalClasses: 40,
    attended: 34,
    percentage: 85,
    bunks: 6,
    safeBunks: 2,
    status: "safe",
  },
  {
    id: 2,
    name: "Operating Systems",
    code: "CS202",
    professor: "Prof. Johnson",
    totalClasses: 35,
    attended: 24,
    percentage: 68,
    bunks: 11,
    safeBunks: 0,
    status: "danger",
  },
  {
    id: 3,
    name: "Computer Networks",
    code: "CS203",
    professor: "Dr. Lee",
    totalClasses: 30,
    attended: 28,
    percentage: 93,
    bunks: 2,
    safeBunks: 4,
    status: "safe",
  },
  {
    id: 4,
    name: "Database Management Systems",
    code: "CS204",
    professor: "Prof. Williams",
    totalClasses: 25,
    attended: 20,
    percentage: 80,
    bunks: 5,
    safeBunks: 1,
    status: "safe",
  },
  {
    id: 5,
    name: "Software Engineering",
    code: "CS205",
    professor: "Dr. Brown",
    totalClasses: 20,
    attended: 16,
    percentage: 80,
    bunks: 4,
    safeBunks: 1,
    status: "safe",
  },
  {
    id: 6,
    name: "Algorithms",
    code: "CS206",
    professor: "Prof. Davis",
    totalClasses: 32,
    attended: 26,
    percentage: 81,
    bunks: 6,
    safeBunks: 2,
    status: "safe",
  },
];

export function Attendance() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<SubjectAttendance[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true);
        const data = await MvpService.getAttendance();
        if (data.subjects && data.subjects.length > 0) {
          setSubjects(data.subjects);
        } else {
          setSubjects(SEED_DATA);
        }
      } catch {
        setSubjects(SEED_DATA);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, []);

  const filteredSubjects = subjects.filter((s) => {
    if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !s.code.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !s.professor.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const overallPercentage = filteredSubjects.length > 0 
    ? filteredSubjects.reduce((sum, s) => sum + s.percentage, 0) / filteredSubjects.length
    : 0;

  const safeCount = filteredSubjects.filter((s) => s.status === "safe").length;
  const warningCount = filteredSubjects.filter((s) => s.status === "warning").length;
  const dangerCount = filteredSubjects.filter((s) => s.status === "danger").length;

  const totalSafeBunks = filteredSubjects.reduce((sum, s) => sum + s.safeBunks, 0);

  return (
    <div className="flex flex-col h-full bg-primary">
      {/* Header */}
      <div className="px-4 py-4 shrink-0 bg-secondary border-b border-primary">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-primary">
              Attendance
            </h1>
            <p className="text-sm mt-1 text-secondary">
              Track your class attendance and bunk budget
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-2 py-1.5 rounded-lg text-sm bg-tertiary border border-primary text-primary placeholder:text-muted"
          />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="rounded-xl p-3 bg-tertiary border border-primary">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center badge-success">
                <TrendingUp size={16} className="text-success" />
              </div>
              <div>
                <p className="text-xs text-secondary">Overall</p>
                <p className="text-lg font-semibold text-success">{overallPercentage.toFixed(1)}%</p>
              </div>
            </div>
          </div>
          
          <div className="rounded-xl p-3 bg-tertiary border border-primary">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center badge-success">
                <CheckCircle size={16} className="text-success" />
              </div>
              <div>
                <p className="text-xs text-secondary">Safe</p>
                <p className="text-lg font-semibold text-success">{safeCount}</p>
              </div>
            </div>
          </div>
          
          <div className="rounded-xl p-3 bg-tertiary border border-primary">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center badge-warning">
                <AlertTriangle size={16} className="text-warning" />
              </div>
              <div>
                <p className="text-xs text-secondary">Warning</p>
                <p className="text-lg font-semibold text-warning">{warningCount}</p>
              </div>
            </div>
          </div>
          
          <div className="rounded-xl p-3 bg-tertiary border border-primary">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center badge-danger">
                <XCircle size={16} className="text-danger" />
              </div>
              <div>
                <p className="text-xs text-secondary">Danger</p>
                <p className="text-lg font-semibold text-danger">{dangerCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bunk Budget Summary */}
        <div className="mt-4 p-3 rounded-xl bg-tertiary border border-primary">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center badge-info">
                <Calendar size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-xs text-secondary">Total Safe Bunks This Week</p>
                <p className="text-xl font-semibold text-primary">{totalSafeBunks}</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/finance")}
              className="text-xs flex items-center gap-1 text-primary"
            >
              View Bunk Budget
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Subject List */}
        {filteredSubjects.map((subject) => {
          const config = STATUS_CONFIG[subject.status];
          return (
            <div
              key={subject.id}
              className="rounded-xl p-3 bg-card border border-primary"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 badge-success">
                    <config.icon size={18} className={subject.status === 'safe' ? 'text-success' : subject.status === 'warning' ? 'text-warning' : 'text-danger'} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary">
                      {subject.name}
                    </p>
                    <p className="text-xs text-secondary">
                      {subject.code} · {subject.professor}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <div className={`text-xs ${subject.status === 'safe' ? 'text-success' : subject.status === 'warning' ? 'text-warning' : 'text-danger'}`}>
                      {config.label}
                    </div>
                    <div className="text-lg font-semibold text-primary">
                      {subject.percentage}%
                    </div>
                  </div>
                  <p className="text-xs mt-1 text-secondary">
                    {subject.attended}/{subject.totalClasses} classes
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-secondary">Bunks: {subject.bunks}</span>
                  <span className={`text-xs ${subject.safeBunks > 0 ? 'text-success' : 'text-danger'}`}>
                    Safe: {subject.safeBunks}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden bg-border-primary">
                  <div
                    className={`h-full rounded-full ${subject.percentage >= 75 ? 'bg-success-500' : subject.percentage >= 65 ? 'bg-warning-500' : 'bg-danger-500'}`}
                    style={{ width: `${subject.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {filteredSubjects.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Users size={48} className="text-primary" />
            <p className="text-sm mt-4 text-secondary">
              No subjects found matching your search
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

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-warning-900/20 border border-warning-500">
            <AlertTriangle size={16} className="text-warning" />
            <p className="text-sm text-warning-400">{error}</p>
          </div>
        )}
      </div>


    </div>
  );
}
