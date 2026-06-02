import { useState, useEffect } from "react";
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Search,
  Filter,
  ArrowRight,
} from "lucide-react";
import MvpService from "../services/mvpService";

interface BunkBudget {
  id: number;
  subject: string;
  code: string;
  totalClasses: number;
  attended: number;
  bunksTaken: number;
  safeBunks: number;
  percentage: number;
  status: "safe" | "warning" | "danger";
}

interface Expense {
  id: number;
  category: string;
  amount: number;
  date: string;
  description: string;
  type: "income" | "expense";
}

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  safe: { color: "var(--success-500)", bg: "rgba(16, 185, 129, 0.1)" },
  warning: { color: "var(--warning-500)", bg: "rgba(245, 158, 11, 0.1)" },
  danger: { color: "var(--danger-500)", bg: "rgba(239, 68, 68, 0.1)" },
};

const SEED_BUNK_BUDGET: BunkBudget[] = [
  { id: 1, subject: "Data Structures", code: "CS201", totalClasses: 40, attended: 34, bunksTaken: 6, safeBunks: 2, percentage: 85, status: "safe" },
  { id: 2, subject: "Operating Systems", code: "CS202", totalClasses: 35, attended: 24, bunksTaken: 11, safeBunks: 0, percentage: 68, status: "danger" },
  { id: 3, subject: "Computer Networks", code: "CS203", totalClasses: 30, attended: 28, bunksTaken: 2, safeBunks: 4, percentage: 93, status: "safe" },
  { id: 4, subject: "Database Management", code: "CS204", totalClasses: 25, attended: 20, bunksTaken: 5, safeBunks: 1, percentage: 80, status: "safe" },
  { id: 5, subject: "Software Engineering", code: "CS205", totalClasses: 20, attended: 16, bunksTaken: 4, safeBunks: 1, percentage: 80, status: "safe" },
];

const SEED_EXPENSES: Expense[] = [
  { id: 1, category: "Food", amount: 1500, date: "Jun 5", description: "Mess fees", type: "expense" },
  { id: 2, category: "Transport", amount: 500, date: "Jun 4", description: "Bus fare", type: "expense" },
  { id: 3, category: "Books", amount: 2000, date: "Jun 3", description: "DSA Book", type: "expense" },
  { id: 4, category: "Pocket Money", amount: 10000, date: "Jun 1", description: "Monthly allowance", type: "income" },
  { id: 5, category: "Stationery", amount: 800, date: "Jun 2", description: "Notebooks", type: "expense" },
];

export function Finance() {
  const [bunkBudget, setBunkBudget] = useState<BunkBudget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("bunk-budget");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const bunkData = await MvpService.getBunkBudget();
        const expenseData = await MvpService.getExpenses();
        
        if (bunkData.budget && bunkData.budget.length > 0) {
          setBunkBudget(bunkData.budget);
        } else {
          setBunkBudget(SEED_BUNK_BUDGET);
        }
        
        if (expenseData.expenses && expenseData.expenses.length > 0) {
          setExpenses(expenseData.expenses);
        } else {
          setExpenses(SEED_EXPENSES);
        }
      } catch {
        setBunkBudget(SEED_BUNK_BUDGET);
        setExpenses(SEED_EXPENSES);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredBunkBudget = bunkBudget.filter((b) => {
    if (searchQuery && !b.subject.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !b.code.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const filteredExpenses = expenses.filter((e) => {
    if (searchQuery && !e.category.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !e.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const totalSafeBunks = filteredBunkBudget.reduce((sum, b) => sum + b.safeBunks, 0);
  const totalBunksTaken = filteredBunkBudget.reduce((sum, b) => sum + b.bunksTaken, 0);
  const averagePercentage = filteredBunkBudget.length > 0 
    ? filteredBunkBudget.reduce((sum, b) => sum + b.percentage, 0) / filteredBunkBudget.length
    : 0;

  const totalIncome = filteredExpenses.filter(e => e.type === "income").reduce((sum, e) => sum + e.amount, 0);
  const totalExpense = filteredExpenses.filter(e => e.type === "expense").reduce((sum, e) => sum + e.amount, 0);
  const balance = totalIncome - totalExpense;

  const dangerCount = filteredBunkBudget.filter(b => b.status === "danger").length;

  return (
    <div className="flex flex-col h-full bg-primary">
      {/* Header */}
      <div className="px-4 py-4 shrink-0 bg-secondary border-b border-primary">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-primary">
              Finance
            </h1>
            <p className="text-sm mt-1 text-secondary">
              Track your bunk budget and expenses
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-4">
          <button
            onClick={() => setActiveTab("bunk-budget")}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${activeTab === "bunk-budget" ? "bg-tertiary border border-primary text-primary" : "text-secondary"}`}
          >
            Bunk Budget
          </button>
          <button
            onClick={() => setActiveTab("expenses")}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${activeTab === "expenses" ? "bg-tertiary border border-primary text-primary" : "text-secondary"}`}
          >
            Expenses
          </button>
          <button
            onClick={() => setActiveTab("summary")}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${activeTab === "summary" ? "bg-tertiary border border-primary text-primary" : "text-secondary"}`}
          >
            Summary
          </button>
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-2 py-1.5 rounded-lg text-sm bg-tertiary border border-primary text-primary placeholder:text-muted"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Bunk Budget Tab */}
        {activeTab === "bunk-budget" && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl p-3 bg-tertiary border border-primary">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center badge-success">
                    <CheckCircle size={16} className="text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-secondary">Total Safe Bunks</p>
                    <p className="text-xl font-semibold text-success">{totalSafeBunks}</p>
                  </div>
                </div>
              </div>
              
              <div className="rounded-xl p-3 bg-tertiary border border-primary">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center badge-warning">
                    <Calendar size={16} className="text-warning" />
                  </div>
                  <div>
                    <p className="text-xs text-secondary">Bunks Taken</p>
                    <p className="text-xl font-semibold text-warning">{totalBunksTaken}</p>
                  </div>
                </div>
              </div>
              
              <div className="rounded-xl p-3 bg-tertiary border border-primary">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center badge-info">
                    <TrendingUp size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-secondary">Avg Attendance</p>
                    <p className="text-xl font-semibold text-primary">{averagePercentage.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>

            {dangerCount > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-warning-900/20 border border-warning-500">
                <AlertTriangle size={16} className="text-warning" />
                <p className="text-sm text-warning-400">
                  ⚠️ {dangerCount} subjects below 75% attendance - attend all classes!
                </p>
              </div>
            )}

            {/* Bunk Budget List */}
            <div className="space-y-3">
              {filteredBunkBudget.map((b) => {
                const config = STATUS_COLORS[b.status];
                return (
                  <div
                    key={b.id}
                    className="rounded-xl p-3 bg-card border border-primary"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 badge-success">
                          {b.status === "safe" && <CheckCircle size={18} className="text-success" />}
                          {b.status === "warning" && <AlertTriangle size={18} className="text-warning" />}
                          {b.status === "danger" && <XCircle size={18} className="text-danger" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-primary">
                            {b.subject}
                          </p>
                          <p className="text-xs text-secondary">
                            {b.code} · {b.attended}/{b.totalClasses} classes
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <div className={`text-lg font-semibold ${b.safeBunks > 0 ? 'text-success' : 'text-danger'}`}>
                            {b.safeBunks}
                          </div>
                          <div className="text-xs text-secondary">
                            safe
                          </div>
                        </div>
                        <p className="text-xs mt-1 text-secondary">
                          {b.bunksTaken} taken · {b.percentage}%
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="h-1.5 rounded-full overflow-hidden bg-border-primary">
                        <div
                          className={`h-full rounded-full ${b.percentage >= 75 ? 'bg-success-500' : b.percentage >= 65 ? 'bg-warning-500' : 'bg-danger-500'}`}
                          style={{ width: `${b.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Expenses Tab */}
        {activeTab === "expenses" && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl p-3 bg-tertiary border border-primary">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center badge-success">
                    <IndianRupee size={16} className="text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-secondary">Total Income</p>
                    <p className="text-xl font-semibold text-success">₹{totalIncome}</p>
                  </div>
                </div>
              </div>
              
              <div className="rounded-xl p-3 bg-tertiary border border-primary">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center badge-danger">
                    <IndianRupee size={16} className="text-danger" />
                  </div>
                  <div>
                    <p className="text-xs text-secondary">Total Expense</p>
                    <p className="text-xl font-semibold text-danger">₹{totalExpense}</p>
                  </div>
                </div>
              </div>
              
              <div className="rounded-xl p-3 bg-tertiary border border-primary">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center badge-info">
                    <Wallet size={16} className={balance >= 0 ? "text-success" : "text-danger"} />
                  </div>
                  <div>
                    <p className="text-xs text-secondary">Balance</p>
                    <p className={`text-xl font-semibold ${balance >= 0 ? 'text-success' : 'text-danger'}`}>
                      ₹{balance}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Expense List */}
            <div className="space-y-3">
              {filteredExpenses.map((e) => (
                <div
                  key={e.id}
                  className="rounded-xl p-3 bg-card border border-primary"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${e.type === "income" ? "badge-success" : "badge-danger"}`}>
                        {e.type === "income" ? (
                          <TrendingUp size={18} className="text-success" />
                        ) : (
                          <TrendingDown size={18} className="text-danger" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-primary">
                          {e.category}
                        </p>
                        <p className="text-xs text-secondary">
                          {e.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-semibold ${e.type === "income" ? "text-success" : "text-danger"}`}>
                        {e.type === "income" ? "+" : "-"} ₹{e.amount}
                      </p>
                      <p className="text-xs mt-1 text-secondary">
                        {e.date}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Summary Tab */}
        {activeTab === "summary" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-4 bg-tertiary border border-primary">
                <h2 className="text-sm font-medium mb-3 text-primary">
                  Bunk Budget Summary
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-xs text-secondary">Total Safe Bunks</span>
                    <span className="text-sm font-medium text-success">{totalSafeBunks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-secondary">Bunks Taken</span>
                    <span className="text-sm font-medium text-warning">{totalBunksTaken}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-secondary">Average Attendance</span>
                    <span className="text-sm font-medium text-primary">{averagePercentage.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-secondary">Subjects in Danger</span>
                    <span className="text-sm font-medium text-danger">{dangerCount}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl p-4 bg-tertiary border border-primary">
                <h2 className="text-sm font-medium mb-3 text-primary">
                  Financial Summary
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-xs text-secondary">Total Income</span>
                    <span className="text-sm font-medium text-success">₹{totalIncome}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-secondary">Total Expense</span>
                    <span className="text-sm font-medium text-danger">₹{totalExpense}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-secondary">Balance</span>
                    <span className={`text-sm font-medium ${balance >= 0 ? 'text-success' : 'text-danger'}`}>
                      ₹{balance}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl p-4 bg-tertiary border border-primary">
              <h2 className="text-sm font-medium mb-3 text-primary">
                Tips
              </h2>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-xs text-secondary">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 badge-info">
                    <CheckCircle size={10} className="text-primary" />
                  </div>
                  <span>Attend all classes for subjects below 75% to recover attendance</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-secondary">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 badge-info">
                    <CheckCircle size={10} className="text-primary" />
                  </div>
                  <span>Track your expenses weekly to stay within budget</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-secondary">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 badge-info">
                    <CheckCircle size={10} className="text-primary" />
                  </div>
                  <span>Use safe bunks wisely - don't exceed the limit</span>
                </li>
              </ul>
            </div>
          </>
        )}

        {filteredBunkBudget.length === 0 && filteredExpenses.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Wallet size={48} className="text-primary" />
            <p className="text-sm mt-4 text-secondary">
              No data found matching your search
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
