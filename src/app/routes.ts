import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Attendance } from "./pages/Attendance";
import { Chat } from "./pages/Chat";
import { Schedule } from "./pages/Schedule";
import { More } from "./pages/More";
import { Finance } from "./pages/Finance";
import { Jobs } from "./pages/Jobs";
import { Travel } from "./pages/Travel";
import { Placement } from "./pages/Placement";
import { Assignments } from "./pages/Assignments";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "attendance", Component: Attendance },
      { path: "chat", Component: Chat },
      { path: "schedule", Component: Schedule },
      { path: "more", Component: More },
      { path: "finance", Component: Finance },
      { path: "jobs", Component: Jobs },
      { path: "travel", Component: Travel },
      { path: "placement", Component: Placement },
      { path: "assignments", Component: Assignments },
    ],
  },
]);
