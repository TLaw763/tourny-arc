#!/usr/bin/env node
/**
 * Stops a running `next dev` instance for this project.
 * Reads PID/port from `.next/dev/lock` (Next.js 16 lockDistDir).
 */
import { readFileSync, unlinkSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lockPath = join(root, ".next/dev/lock");

function isRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function stopPid(pid) {
  if (!isRunning(pid)) return false;
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    return false;
  }
  execSync("sleep 0.5");
  if (isRunning(pid)) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      /* already gone */
    }
  }
  return true;
}

function freePort(port) {
  try {
    execSync(`fuser -k ${port}/tcp 2>/dev/null`, { stdio: "ignore" });
  } catch {
    /* nothing listening */
  }
}

let stopped = false;

if (existsSync(lockPath)) {
  try {
    const info = JSON.parse(readFileSync(lockPath, "utf8"));
    if (info.pid && stopPid(info.pid)) {
      console.log(`Stopped dev server (PID ${info.pid}) at ${info.appUrl ?? "unknown URL"}`);
      stopped = true;
    } else if (info.pid) {
      console.log(`Lock file references PID ${info.pid}, but it is not running.`);
    }
  } catch {
    console.log("Could not parse .next/dev/lock; clearing it.");
  }

  try {
    unlinkSync(lockPath);
    console.log("Removed .next/dev/lock");
  } catch {
    /* flock may still be held briefly */
  }
}

for (const port of [3000, 3001]) {
  freePort(port);
}

if (!stopped && !existsSync(lockPath)) {
  console.log("No running dev server found for this project.");
} else if (stopped) {
  console.log("Dev server stopped. Run `pnpm dev` to start fresh.");
}
