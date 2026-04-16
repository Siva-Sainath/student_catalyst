import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, MapPin, Clock, Navigation, ChevronRight, Train, Bus, Car, Bike } from "lucide-react";

const popularRoutes = [
  { from: "Kelambakkam", to: "VIT Chennai", time: "25 min", modes: ["Bus", "Auto"] },
  { from: "Sholinganallur", to: "VIT Chennai", time: "20 min", modes: ["Bus", "Cab"] },
  { from: "Tambaram", to: "VIT Chennai", time: "40 min", modes: ["Train", "Bus"] },
  { from: "Velachery", to: "VIT Chennai", time: "30 min", modes: ["Bus", "Auto"] },
];

const busRoutes = [
  { number: "119C", from: "Kelambakkam", stops: ["Sholinganallur", "OMR", "VIT Gate"], time: "9:05 AM", eta: "4 min", seats: 12, fare: "₹15" },
  { number: "599", from: "Tambaram", stops: ["Medavakkam", "Perungudi", "VIT Gate"], time: "9:20 AM", eta: "18 min", seats: 8, fare: "₹22" },
  { number: "119D", from: "Kelambakkam", stops: ["Navallur", "Padur", "VIT Gate"], time: "9:35 AM", eta: "32 min", seats: 15, fare: "₹15" },
];

const cabOptions = [
  { type: "Auto", icon: "🛺", eta: "3 min", price: "₹60–80", shared: false },
  { type: "Bike", icon: "🏍️", eta: "2 min", price: "₹35–45", shared: false },
  { type: "Mini Cab", icon: "🚗", eta: "5 min", price: "₹120–150", shared: false },
  { type: "Share Auto", icon: "🛺", eta: "8 min", price: "₹20", shared: true },
];

const liveAlerts = [
  { text: "Bus 119C running 5 min late today", type: "warning" },
  { text: "Heavy traffic on OMR near Sholinganallur", type: "danger" },
];

export function Travel() {
  const navigate = useNavigate();
  const [from, setFrom] = useState("Kelambakkam");
  const [tab, setTab] = useState<"routes" | "bus" | "cab">("routes");
  const [activeRoute, setActiveRoute] = useState(0);

  return (
    <div className="px-4 py-3 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft size={20} style={{ color: "#6b8cad" }} />
        </button>
        <div>
          <h1 className="text-xl" style={{ color: "#e8f0fe" }}>
            Travel Planner
          </h1>
          <p className="text-xs" style={{ color: "#6b8cad" }}>
            Day scholar transport assistant
          </p>
        </div>
      </div>

      {/* Route input */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{ background: "#0a1628", border: "1px solid #1e3561" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: "#3b82f6" }} />
            <div className="w-0.5 h-6" style={{ background: "#1e3561" }} />
            <div className="w-2 h-2 rounded-full" style={{ background: "#22c55e" }} />
          </div>
          <div className="flex-1 space-y-2">
            <div
              className="rounded-xl px-3 py-2"
              style={{ background: "#0d1f3c", border: "1px solid #1e3561" }}
            >
              <p className="text-[10px]" style={{ color: "#6b8cad" }}>
                FROM
              </p>
              <input
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="bg-transparent outline-none text-sm w-full"
                style={{ color: "#e8f0fe" }}
              />
            </div>
            <div
              className="rounded-xl px-3 py-2"
              style={{ background: "#0d1f3c", border: "1px solid #1e3561" }}
            >
              <p className="text-[10px]" style={{ color: "#6b8cad" }}>
                TO
              </p>
              <p className="text-sm" style={{ color: "#e8f0fe" }}>
                VIT Chennai
              </p>
            </div>
          </div>
        </div>
        <button
          className="w-full py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
          style={{ background: "#3b82f6", color: "#fff" }}
        >
          <Navigation size={15} />
          Plan My Route
        </button>
      </div>

      {/* Live alerts */}
      {liveAlerts.map((alert, i) => (
        <div
          key={i}
          className="rounded-xl px-3 py-2 flex items-center gap-2"
          style={{
            background: alert.type === "warning" ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
            border: `1px solid ${alert.type === "warning" ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)"}`,
          }}
        >
          <span className="text-sm">{alert.type === "warning" ? "⚠️" : "🔴"}</span>
          <p className="text-xs" style={{ color: alert.type === "warning" ? "#fbbf24" : "#fca5a5" }}>
            {alert.text}
          </p>
        </div>
      ))}

      {/* Tabs */}
      <div
        className="flex rounded-xl p-1"
        style={{ background: "#0a1628", border: "1px solid #1e3561" }}
      >
        {(["routes", "bus", "cab"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-xs transition-all"
            style={{
              background: tab === t ? "#3b82f6" : "transparent",
              color: tab === t ? "#fff" : "#6b8cad",
            }}
          >
            {t === "routes" ? "🗺️ Routes" : t === "bus" ? "🚌 Buses" : "🚗 Cabs"}
          </button>
        ))}
      </div>

      {tab === "routes" && (
        <div className="space-y-2">
          {popularRoutes.map((r, i) => (
            <button
              key={i}
              onClick={() => setActiveRoute(i)}
              className="w-full rounded-2xl p-3 text-left"
              style={{
                background: activeRoute === i ? "rgba(59,130,246,0.1)" : "#0a1628",
                border: `1px solid ${activeRoute === i ? "#3b82f6" : "#1e3561"}`,
              }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm" style={{ color: "#e8f0fe" }}>
                    {r.from} → {r.to}
                  </p>
                  <div className="flex gap-2 mt-1.5">
                    {r.modes.map((m) => (
                      <span
                        key={m}
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: "#0d1f3c", color: "#8ba3c7", border: "1px solid #1e3561" }}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={12} style={{ color: "#6b8cad" }} />
                  <span className="text-xs" style={{ color: "#3b82f6" }}>
                    {r.time}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {tab === "bus" && (
        <div className="space-y-3">
          {busRoutes.map((bus, i) => (
            <div
              key={i}
              className="rounded-2xl p-3"
              style={{ background: "#0a1628", border: "1px solid #1e3561" }}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(59,130,246,0.15)" }}
                  >
                    <span className="text-sm" style={{ color: "#3b82f6" }}>
                      {bus.number}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: "#e8f0fe" }}>
                      From {bus.from}
                    </p>
                    <p className="text-xs" style={{ color: "#6b8cad" }}>
                      {bus.stops.join(" → ")}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 mt-2">
                <div>
                  <p className="text-[10px]" style={{ color: "#6b8cad" }}>
                    Arrives
                  </p>
                  <p className="text-xs" style={{ color: "#e8f0fe" }}>
                    {bus.time}
                  </p>
                </div>
                <div>
                  <p className="text-[10px]" style={{ color: "#6b8cad" }}>
                    ETA
                  </p>
                  <p className="text-xs" style={{ color: "#22c55e" }}>
                    {bus.eta}
                  </p>
                </div>
                <div>
                  <p className="text-[10px]" style={{ color: "#6b8cad" }}>
                    Seats
                  </p>
                  <p className="text-xs" style={{ color: bus.seats < 10 ? "#f59e0b" : "#e8f0fe" }}>
                    {bus.seats} left
                  </p>
                </div>
                <div className="ml-auto">
                  <p className="text-[10px]" style={{ color: "#6b8cad" }}>
                    Fare
                  </p>
                  <p className="text-xs" style={{ color: "#e8f0fe" }}>
                    {bus.fare}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "cab" && (
        <div className="space-y-3">
          {cabOptions.map((cab, i) => (
            <div
              key={i}
              className="rounded-2xl p-3 flex items-center gap-3"
              style={{ background: "#0a1628", border: "1px solid #1e3561" }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ background: "#0d1f3c" }}
              >
                {cab.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm" style={{ color: "#e8f0fe" }}>
                    {cab.type}
                  </p>
                  {cab.shared && (
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}
                    >
                      Shared
                    </span>
                  )}
                </div>
                <p className="text-xs" style={{ color: "#6b8cad" }}>
                  {cab.eta} away
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm" style={{ color: "#e8f0fe" }}>
                  {cab.price}
                </p>
                <button
                  className="text-xs px-2.5 py-1 rounded-lg mt-1"
                  style={{ background: "#3b82f6", color: "#fff" }}
                >
                  Book
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="h-2" />
    </div>
  );
}
