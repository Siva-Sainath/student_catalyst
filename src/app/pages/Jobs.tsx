import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Bookmark, ExternalLink, MapPin, Clock, Search } from "lucide-react";
import JobsService from "../services/jobsService";

const jobs = [
  {
    company: "Google",
    role: "SWE Intern",
    logo: "🟦",
    location: "Bangalore",
    stipend: "₹80,000/mo",
    type: "Internship",
    deadline: "Apr 5",
    daysLeft: 10,
    tags: ["React", "Python", "System Design"],
    new: true,
    link: "https://www.google.com/about/careers/applications/jobs/results/?q=software%20engineering%20intern",
  },
  {
    company: "Microsoft",
    role: "Product Intern",
    logo: "🪟",
    location: "Hyderabad",
    stipend: "₹70,000/mo",
    type: "Internship",
    deadline: "Apr 12",
    daysLeft: 17,
    tags: ["SQL", "Product Thinking", "Azure"],
    new: true,
    link: "https://careers.microsoft.com/us/en/search-results?keywords=software%20engineer%20intern",
  },
  {
    company: "Swiggy",
    role: "Backend Engineer",
    logo: "🟠",
    location: "Remote",
    stipend: "₹12 LPA",
    type: "Full-time",
    deadline: "Apr 20",
    daysLeft: 25,
    tags: ["Node.js", "Kafka", "PostgreSQL"],
    new: false,
    link: "https://careers.swiggy.com/#/",
  },
  {
    company: "Razorpay",
    role: "Frontend Intern",
    logo: "💙",
    location: "Bangalore",
    stipend: "₹50,000/mo",
    type: "Internship",
    deadline: "Apr 8",
    daysLeft: 13,
    tags: ["React", "TypeScript", "Jest"],
    new: false,
    link: "https://razorpay.com/jobs/",
  },
  {
    company: "CRED",
    role: "Data Science Intern",
    logo: "⚫",
    location: "Bangalore",
    stipend: "₹60,000/mo",
    type: "Internship",
    deadline: "Apr 15",
    daysLeft: 20,
    tags: ["Python", "ML", "SQL"],
    new: true,
    link: "https://careers.cred.club/",
  },
  {
    company: "Zepto",
    role: "SDE-1",
    logo: "🟣",
    location: "Mumbai",
    stipend: "₹18 LPA",
    type: "Full-time",
    deadline: "May 1",
    daysLeft: 36,
    tags: ["Go", "Microservices", "AWS"],
    new: false,
    link: "https://zepto.app/careers/",
  },
];

const filterTypes = ["All", "Internship", "Full-time", "Remote"];

export function Jobs() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("All");
  const [bookmarked, setBookmarked] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [jobsData, setJobsData] = useState(jobs);

  useEffect(() => {
    (async () => {
      const result = await JobsService.getRecommendations();
      if (result.recommendations?.length) {
        setJobsData(
          result.recommendations.map((job) => ({
            company: job.company,
            role: job.role,
            logo: "🏢",
            location: job.location,
            stipend: job.stipend,
            type: "Internship",
            deadline: job.deadline,
            daysLeft: 14,
            tags: job.skills || [],
            new: job.match_score >= 90,
            link: job.link || "https://careers.google.com",
          }))
        );
      }
    })();
  }, []);

  const filtered = jobsData.filter((j) => {
    const matchesFilter = filter === "All" || j.type === filter || (filter === "Remote" && j.location === "Remote");
    const matchesSearch =
      j.company.toLowerCase().includes(search.toLowerCase()) ||
      j.role.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="px-4 py-3 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft size={20} style={{ color: "#6b8cad" }} />
        </button>
        <div>
          <h1 className="text-xl" style={{ color: "#e8f0fe" }}>
            Jobs & Internships
          </h1>
          <p className="text-xs" style={{ color: "#6b8cad" }}>
            {jobsData.length} opportunities • Updated today
          </p>
        </div>
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2"
        style={{ background: "#0a1628", border: "1px solid #1e3561" }}
      >
        <Search size={15} style={{ color: "#6b8cad" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search companies, roles..."
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: "#e8f0fe" }}
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {filterTypes.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-full text-xs shrink-0 transition-all"
            style={{
              background: filter === f ? "#3b82f6" : "#0a1628",
              color: filter === f ? "#fff" : "#6b8cad",
              border: `1px solid ${filter === f ? "#3b82f6" : "#1e3561"}`,
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Job cards */}
      <div className="space-y-3">
        {filtered.map((job, i) => (
          <div
            key={i}
            className="rounded-2xl p-4"
            style={{ background: "#0a1628", border: "1px solid #1e3561" }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3 flex-1">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: "#0d1f3c" }}
                >
                  {job.logo}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm" style={{ color: "#e8f0fe" }}>
                      {job.role}
                    </p>
                    {job.new && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ background: "rgba(34,197,94,0.2)", color: "#22c55e" }}
                      >
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "#6b8cad" }}>
                    {job.company}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  const next = new Set(bookmarked);
                  if (next.has(i)) next.delete(i);
                  else next.add(i);
                  setBookmarked(next);
                }}
              >
                <Bookmark
                  size={16}
                  fill={bookmarked.has(i) ? "#3b82f6" : "none"}
                  style={{ color: bookmarked.has(i) ? "#3b82f6" : "#4a6585" }}
                />
              </button>
            </div>

            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1">
                <MapPin size={11} style={{ color: "#6b8cad" }} />
                <span className="text-xs" style={{ color: "#8ba3c7" }}>
                  {job.location}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={11} style={{ color: "#6b8cad" }} />
                <span className="text-xs" style={{ color: "#8ba3c7" }}>
                  {job.daysLeft}d left
                </span>
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded-full ml-auto"
                style={{
                  background:
                    job.type === "Internship"
                      ? "rgba(59,130,246,0.15)"
                      : "rgba(139,92,246,0.15)",
                  color: job.type === "Internship" ? "#3b82f6" : "#8b5cf6",
                }}
              >
                {job.type}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-3">
              {job.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: "#0d1f3c", color: "#8ba3c7", border: "1px solid #1e3561" }}
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex justify-between items-center mt-3 pt-3" style={{ borderTop: "1px solid #1e3561" }}>
              <div>
                <p className="text-xs" style={{ color: "#6b8cad" }}>
                  Stipend / CTC
                </p>
                <p className="text-sm" style={{ color: "#22c55e" }}>
                  {job.stipend}
                </p>
              </div>
              <button
                onClick={() => window.open((job as any).link || "https://careers.google.com", "_blank")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all active:scale-95"
                style={{ background: "#3b82f6", color: "#fff" }}
              >
                Apply
                <ExternalLink size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="h-2" />
    </div>
  );
}
