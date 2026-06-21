import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const projectRoot = process.cwd();
const hasSpaceInPath = projectRoot.includes(" ");

function startDev(cwd) {
  const child = spawn("npx", ["next", "dev"], {
    cwd,
    stdio: "inherit",
    env: process.env,
    shell: true,
  });

  child.on("exit", (code) => process.exit(code ?? 0));
}

if (!hasSpaceInPath) {
  startDev(projectRoot);
  process.exit(0);
}

const devRoot = path.join(os.tmpdir(), "rngblox-delivery-dev");

console.warn(
  `[dev] Project path contains spaces ("${projectRoot}"). Starting dev server from ${devRoot}`
);

if (fs.existsSync(devRoot)) {
  fs.rmSync(devRoot, { recursive: true, force: true });
}

fs.mkdirSync(devRoot, { recursive: true });

try {
  execSync(
    `robocopy "${projectRoot}" "${devRoot}" /E /XD node_modules .next /XF Roblox.mp4 *.csv /NFL /NDL /NJH /NJS /NC /NS`,
    { cwd: projectRoot, stdio: "ignore", shell: true }
  );
} catch (error) {
  const status = error.status;
  if (!(typeof status === "number" && status >= 0 && status < 8)) {
    throw error;
  }
}

execSync("npm install", { cwd: devRoot, stdio: "inherit", env: process.env, shell: true });
execSync("npm run db:generate", { cwd: devRoot, stdio: "inherit", env: process.env, shell: true });

startDev(devRoot);
