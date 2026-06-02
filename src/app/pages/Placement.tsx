import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Plus, ChevronRight, ExternalLink, Target } from "lucide-react";
import MvpService from "../services/mvpService";

type Stage = "Applied" | "OA" | "Interview" | "Offer" | "Rejected";

interface Application {
  company: string;
  role: string;
  logo: string;
  stage: Stage;
  date: string;
  package?: string;
  nextStep?: string;
  color: string;
}

const applications: Application[] = [
  { company: "Amazon", role: "SDE Intern", logo: "📦", stage: "Interview", date: "Mar 20", nextStep: "Technical Round 2 — Mar 28", color: "var(--warning-500)" },
  { company: "Flipkart", role: "SDE-1", logo: "🛒", stage: "OA", date: "Mar 22", nextStep: "OA deadline — Mar 27", color: "var(--primary-500)" },
  { company: "Infosys", role: "Systems Engineer", logo: "🔷", stage: "Offer", date: "Mar 10", package: "₹6.5 LPA", color: "var(--success-500)" },
  { company: "TCS", role: "Associate Engineer", logo: "🏢", stage: "Applied", date: "Mar 24", color: "var(--secondary-500)" },
  { company: "Wipro", role: "SDE Intern", logo: "🌐", stage: "Rejected", date: "Mar 15", color: "var(--danger-500)" },
  { company: "Zomato", role: "Backend Intern", logo: "🍜", stage: "Applied", date: "Mar 25", color: "var(--danger-400)" },
];

const stages: Stage[] = ["Applied", "OA", "Interview", "Offer", "Rejected"];

const stageColors: Record<Stage, { bg: string; text: string; border: string }> = {
  Applied: { bg: "rgba(139,92,246,0.15)", text: "var(--secondary-500)", border: "rgba(139,92,246,0.3)" },
  OA: { bg: "rgba(59,130,246,0.15)", text: "var(--primary-500)", border: "rgba(59,130,246,0.3)" },
  Interview: { bg: "rgba(245,158,11,0.15)", text: "var(--warning-500)", border: "rgba(245,158,11,0.3)" },
  Offer: { bg: "rgba(34,197,94,0.15)", text: "var(--success-500)", border: "rgba(34,197,94,0.3)" },
  Rejected: { bg: "rgba(239,68,68,0.15)", text: "var(--danger-500)", border: "rgba(239,68,68,0.3)" },
};

export function Placement() {
  const navigate = useNavigate();
  const [filterStage, setFilterStage] = useState<Stage | "All">("All");
  const [records, setRecords] = useState(applications);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await MvpService.getPlacement();
        const mapped: Application[] = (data.applications || []).map((item: any) => ({
          company: item.company,
          role: item.role,
          logo: "🏢",
          stage: item.stage as Stage,
          date: new Date(item.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          color: "var(--primary-500)",
        }));
        if (mapped.length) setRecords(mapped);
      } catch {
        // fallback to local data
      }
    })();
  }, []);

  const filtered = filterStage === "All" ? records : records.filter((a) => a.stage === filterStage);

  const stats = {
    applied: records.length,
    oa: records.filter((a) => a.stage === "OA").length,
    interviews: records.filter((a) => a.stage === "Interview").length,
    offers: records.filter((a) => a.stage === "Offer").length,
    rejected: records.filter((a) => a.stage === "Rejected").length,
  };

  const cycleStage = async (index: number) => {
    const stageOrder: Stage[] = ["Applied", "OA", "Interview", "Offer", "Rejected"];
    const selected = filtered[index];
    if (!selected) return;
    const currentIdx = stageOrder.indexOf(selected.stage);
    const nextStage = stageOrder[(currentIdx + 1) % stageOrder.length];
    setRecords((prev) =>
      prev.map((item) =>
        item.company === selected.company && item.role === selected.role ? { ...item, stage: nextStage } : item
      )
    );
    try {
      const application = (await MvpService.getPlacement()).applications.find(
        (a: any) => a.company === selected.company && a.role === selected.role
      );
      if (application) {
        await MvpService.updatePlacement(application.id, { stage: nextStage });
      }
    } catch {
      // keep optimistic update
    }
  };

  const addQuickApplication = async () => {
    setCreating(true);
    try {
      await MvpService.createPlacement({
        company: "Campus Startup",
        role: "Software Intern",
        stage: "Applied",
      });
      const refreshed = await MvpService.getPlacement();
      const mapped: Application[] = (refreshed.applications || []).map((item: any) => ({
        company: item.company,
        role: item.role,
        logo: "🏢",
        stage: item.stage as Stage,
        date: new Date(item.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        color: "var(--primary-500)",
      }));
      if (mapped.length) setRecords(mapped);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="px-4 py-3 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft size={20} className="text-secondary" />
        </button>
        <div>
          <h1 className="text-xl text-primary">
            Placement Tracker
          </h1>
          <p className="text-xs text-secondary">
            Campus Placement 2026
          </p>
        </div>
        <button
          onClick={addQuickApplication}
          className="ml-auto w-8 h-8 rounded-xl flex items-center justify-center btn-primary"
        >
          <Plus size={16} style={{ color: creating ? "rgba(255,255,255,0.6)" : "#fff" }} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: "Applied", value: stats.applied, color: "var(--secondary-500)" },
          { label: "OA", value: stats.oa, color: "var(--primary-500)" },
          { label: "Interview", value: stats.interviews, color: "var(--warning-500)" },
          { label: "Offer", value: stats.offers, color: "var(--success-500)" },
          { label: "Rejected", value: stats.rejected, color: "var(--danger-500)" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-2 text-center bg-secondary border border-primary"
          >
            <p className="text-base" style={{ color: s.color }}>
              {s.value}
            </p>
            <p className="text-[9px] text-muted">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Progress funnel */}
      <div
        className="rounded-2xl p-4 bg-secondary border border-primary"
      >
        <p className="text-xs mb-3 text-primary">
          Application Funnel
        </p>
        <div className="space-y-2">
          {[
            { stage: "Applied", count: stats.applied, max: stats.applied },
            { stage: "OA / Test", count: stats.oa, max: stats.applied },
            { stage: "Interviews", count: stats.interviews, max: stats.applied },
            { stage: "Offers", count: stats.offers, max: stats.applied },
          ].map((item) => (
            <div key={item.stage}>
              <div className="flex justify-between mb-1">
                <span className="text-[11px] text-secondary">
                  {item.stage}
                </span>
                <span className="text-[11px] text-primary">
                  {item.count}
                </span>
              </div>
              <div
                className="h-2 rounded-full overflow-hidden bg-border-primary"
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(item.count / item.max) * 100}%`,
                    background:
                      item.stage === "Offers"
                        ? "var(--success-500)"
                        : item.stage === "Interviews"
                        ? "var(--warning-500)"
                        : item.stage === "OA / Test"
                        ? "var(--primary-500)"
                        : "var(--secondary-500)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-primary">
          <Target size={13} className="text-success" />
          <p className="text-xs text-secondary">
            Conversion rate:{" "}
            <span className="text-success">
              {Math.round((stats.offers / stats.applied) * 100)}%
            </span>{" "}
            offer rate
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {(["All", ...stages] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStage(s)}
            className="px-3 py-1.5 rounded-full text-xs shrink-0 transition-all"
            style={{
              background: filterStage === s ? "var(--primary-500)" : "var(--bg-hover)",
              color: filterStage === s ? "var(--neutral-50)" : "var(--text-muted)",
              border: `1px solid ${filterStage === s ? "var(--primary-500)" : "var(--border-primary)"}`,
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Application cards */}
      <div className="space-y-3">
        {filtered.map((app, i) => {
          const sc = stageColors[app.stage];
          return (
            <button
              key={i}
              className="rounded-2xl p-3 bg-secondary border border-primary text-left"
              onClick={() => cycleStage(i)}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0 bg-tertiary border border-primary"
                >
                  {app.logo}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-primary">
                        {app.company}
                      </p>
                      <p className="text-xs text-secondary">
                        {app.role}
                      </p>
                    </div>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}
                    >
                      {app.stage}
                    </span>
                  </div>
                  {app.nextStep && (
                    <p className="text-[11px] mt-1.5 text-warning">
                      📌 {app.nextStep}
                    </p>
                  )}
                  {app.package && (
                    <p className="text-[11px] mt-1.5 text-success">
                      🎉 Offer: {app.package}
                    </p>
                  )}
                  <p className="text-[10px] mt-1 text-muted">
                    Applied {app.date}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="h-2" />
    </div>
  );
}
