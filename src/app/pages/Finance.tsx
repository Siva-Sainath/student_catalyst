import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, TrendingDown, TrendingUp, Zap, Plus } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const spending = [
  { name: "Food", value: 3200, color: "#f59e0b" },
  { name: "Transport", value: 1100, color: "#06b6d4" },
  { name: "Study", value: 800, color: "#3b82f6" },
  { name: "Entertainment", value: 650, color: "#8b5cf6" },
  { name: "Misc", value: 450, color: "#6b8cad" },
];

const transactions = [
  { desc: "Mess Canteen", amount: -120, date: "Today, 1:30 PM", cat: "Food", emoji: "🍛" },
  { desc: "Uber to College", amount: -85, date: "Today, 8:10 AM", cat: "Transport", emoji: "🚗" },
  { desc: "Amazon - Book", amount: -349, date: "Yesterday", cat: "Study", emoji: "📚" },
  { desc: "Pocket Money", amount: +3000, date: "Mar 24", cat: "Income", emoji: "💰" },
  { desc: "Pizza Hut", amount: -340, date: "Mar 23", cat: "Food", emoji: "🍕" },
  { desc: "Movie - PVR", amount: -250, date: "Mar 22", cat: "Entertainment", emoji: "🎬" },
  { desc: "Bus Pass", amount: -500, date: "Mar 20", cat: "Transport", emoji: "🚌" },
];

export function Finance() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"overview" | "transactions">("overview");

  const totalSpent = spending.reduce((a, b) => a + b.value, 0);
  const balance = 8450;

  return (
    <div className="px-4 py-3 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft size={20} style={{ color: "#6b8cad" }} />
        </button>
        <div>
          <h1 className="text-xl" style={{ color: "#e8f0fe" }}>
            Finance
          </h1>
          <p className="text-xs" style={{ color: "#6b8cad" }}>
            March 2026
          </p>
        </div>
      </div>

      {/* Balance card */}
      <div
        className="rounded-2xl p-4 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
          border: "1px solid #047857",
        }}
      >
        <div
          className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full opacity-20"
          style={{ background: "#34d399" }}
        />
        <p className="text-xs" style={{ color: "#6ee7b7" }}>
          Available Balance
        </p>
        <p className="text-3xl mt-1" style={{ color: "#fff" }}>
          ₹{balance.toLocaleString()}
        </p>
        <div className="flex gap-4 mt-3">
          <div>
            <p className="text-[10px]" style={{ color: "#6ee7b7" }}>
              Spent This Month
            </p>
            <p className="text-sm" style={{ color: "#fca5a5" }}>
              ₹{totalSpent.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[10px]" style={{ color: "#6ee7b7" }}>
              Saved
            </p>
            <p className="text-sm" style={{ color: "#86efac" }}>
              ₹{(5000 - totalSpent + 1200).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[10px]" style={{ color: "#6ee7b7" }}>
              Budget Left
            </p>
            <p className="text-sm" style={{ color: "#fcd34d" }}>
              ₹{(5000 - totalSpent).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* AI tip */}
      <div
        className="rounded-2xl p-3 flex items-start gap-2"
        style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}
      >
        <Zap size={14} style={{ color: "#3b82f6" }} />
        <div>
          <p className="text-xs" style={{ color: "#60a5fa" }}>
            AI Money Insight
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#8ba3c7" }}>
            You're spending 35% more on food this month. Cooking on weekends can save ~₹600/month.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex rounded-xl p-1"
        style={{ background: "#0a1628", border: "1px solid #1e3561" }}
      >
        {(["overview", "transactions"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-sm transition-all"
            style={{
              background: tab === t ? "#3b82f6" : "transparent",
              color: tab === t ? "#fff" : "#6b8cad",
            }}
          >
            {t === "overview" ? "Breakdown" : "Transactions"}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          {/* Pie chart */}
          <div
            className="rounded-2xl p-4"
            style={{ background: "#0a1628", border: "1px solid #1e3561" }}
          >
            <p className="text-sm mb-3" style={{ color: "#e8f0fe" }}>
              Spending Breakdown
            </p>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={spending}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {spending.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#0d1f3c",
                      border: "1px solid #1e3561",
                      borderRadius: 8,
                      color: "#e8f0fe",
                    }}
                    formatter={(v: number) => [`₹${v}`, ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {spending.map((s) => (
                <div key={s.name} className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: s.color }}
                  />
                  <span className="text-xs" style={{ color: "#8ba3c7" }}>
                    {s.name}
                  </span>
                  <span className="text-xs ml-auto" style={{ color: "#e8f0fe" }}>
                    ₹{s.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Category bars */}
          <div className="space-y-2">
            {spending.map((s) => (
              <div
                key={s.name}
                className="rounded-xl p-3"
                style={{ background: "#0a1628", border: "1px solid #1e3561" }}
              >
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs" style={{ color: "#e8f0fe" }}>
                    {s.name}
                  </span>
                  <span className="text-xs" style={{ color: s.color }}>
                    ₹{s.value}
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: "#1e3561" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(s.value / totalSpent) * 100}%`,
                      background: s.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "transactions" && (
        <div className="space-y-2">
          {transactions.map((t, i) => (
            <div
              key={i}
              className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: "#0a1628", border: "1px solid #1e3561" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{ background: "#0d1f3c" }}
              >
                {t.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm" style={{ color: "#e8f0fe" }}>
                  {t.desc}
                </p>
                <p className="text-xs" style={{ color: "#6b8cad" }}>
                  {t.date} · {t.cat}
                </p>
              </div>
              <div className="text-right">
                <p
                  className="text-sm"
                  style={{ color: t.amount > 0 ? "#22c55e" : "#e8f0fe" }}
                >
                  {t.amount > 0 ? "+" : ""}₹{Math.abs(t.amount)}
                </p>
              </div>
            </div>
          ))}

          <button
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3"
            style={{ background: "#0a1628", border: "1px dashed #1e3561" }}
          >
            <Plus size={14} style={{ color: "#3b82f6" }} />
            <span className="text-sm" style={{ color: "#3b82f6" }}>
              Add Transaction
            </span>
          </button>
        </div>
      )}

      <div className="h-2" />
    </div>
  );
}
