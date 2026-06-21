import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const projectRoot = process.cwd();
const hasSpaceInPath = projectRoot.includes(" ");
const isCi = Boolean(process.env.VERCEL || process.env.CI);

function run(command, cwd = projectRoot, allowRobocopy = false) {
  try {
    execSync(command, { cwd, stdio: "inherit", env: process.env, shell: true });
  } catch (error) {
    const status = error.status;
    if (allowRobocopy && typeof status === "number" && status >= 0 && status < 8) {
      return;
    }
    throw error;
  }
}

function runProductionBuild() {
  run("npx prisma generate");
  run("npx next build");
}

function copyOutputArtifacts(fromRoot) {
  const nextDir = path.join(fromRoot, ".next");
  const targetNext = path.join(projectRoot, ".next");

  if (fs.existsSync(targetNext)) {
    fs.rmSync(targetNext, { recursive: true, force: true });
  }

  fs.cpSync(nextDir, targetNext, { recursive: true });
}

if (isCi || !hasSpaceInPath) {
  runProductionBuild();
  process.exit(0);
}

const buildRoot = path.join(os.tmpdir(), "rngblox-delivery-build");

console.warn(
  `[build] Project path contains spaces ("${projectRoot}"). Building from ${buildRoot}`
);

if (fs.existsSync(buildRoot)) {
  fs.rmSync(buildRoot, { recursive: true, force: true });
}

fs.mkdirSync(buildRoot, { recursive: true });

const excludeDirs = ["/XD", "node_modules", ".next"];
const excludeFiles = ["/XF", "Roblox.mp4", "*.csv"];

run(
  `robocopy "${projectRoot}" "${buildRoot}" /E ${excludeDirs.join(" ")} ${excludeFiles.join(" ")} /NFL /NDL /NJH /NJS /NC /NS`,
  projectRoot,
  true
);

run("npm install", buildRoot);
run("npm run db:generate", buildRoot);
run("npx next build", buildRoot);
copyOutputArtifacts(buildRoot);

console.log("[build] Completed successfully and copied .next output back to project root.");
