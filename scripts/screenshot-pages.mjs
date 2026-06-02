import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
console.log(`projectRoot: ${projectRoot}`);
console.log(`cwd: ${process.cwd()}`);
const screenshotDir = path.resolve(projectRoot, "screenshots");
const serverPort = 4173;
const serverHost = "127.0.0.1";
const baseUrl = `http://${serverHost}:${serverPort}`;

const pages = [
  { name: "dashboard", path: "/" },
  { name: "attendance", path: "/attendance" },
  { name: "chat", path: "/chat" },
  { name: "schedule", path: "/schedule" },
  { name: "more", path: "/more" },
  { name: "finance", path: "/finance" },
  { name: "jobs", path: "/jobs" },
  { name: "travel", path: "/travel" },
  { name: "placement", path: "/placement" },
  { name: "assignments", path: "/assignments" },
];

async function waitForServer() {
  const maxAttempts = 20;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(`${baseUrl}/index.html`, { method: "GET" });
      if (res.ok) return;
    } catch {
      // ignore
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Server did not respond at ${baseUrl}`);
}

function startPreviewServer() {
  const preview = spawn("npx", ["vite", "preview", "--host", serverHost, "--port", String(serverPort)], {
    cwd: projectRoot,
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  });

  preview.stdout.on("data", (data) => {
    process.stdout.write(`[preview] ${data}`);
  });
  preview.stderr.on("data", (data) => {
    process.stderr.write(`[preview] ${data}`);
  });

  preview.on("exit", (code) => {
    if (code !== 0) {
      console.error(`Preview server exited with code ${code}`);
    }
  });
  return preview;
}

async function captureScreenshots() {
  await fs.mkdir(screenshotDir, { recursive: true });

  console.log("Building app...");
  await new Promise((resolve, reject) => {
    const build = spawn("npm run build", { cwd: projectRoot, shell: true, stdio: "inherit" });
    build.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Build failed with code ${code}`));
    });
  });

  const server = startPreviewServer();
  await waitForServer();
  console.log(`Preview server running at ${baseUrl}`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.setViewportSize({ width: 1440, height: 900 });

  for (const item of pages) {
    const url = `${baseUrl}${item.path}`;
    console.log(`Capturing ${item.name} at ${url}`);
    await page.goto(url, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(screenshotDir, `${item.name}.png`), fullPage: true });
  }

  await browser.close();
  server.kill("SIGINT");
  console.log("Screenshots complete.");
}

captureScreenshots().catch((error) => {
  console.error(error);
  process.exit(1);
});
