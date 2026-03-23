#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const owner = process.env.DV_OWNER;
const password = process.env.DV_MASTER_PASSWORD;
const brokerSecret = process.env.DV_BROKER_SECRET;

if (!owner || !password || !brokerSecret) {
  process.stderr.write("Missing env vars. Required: DV_OWNER, DV_MASTER_PASSWORD, DV_BROKER_SECRET\n");
  process.exit(1);
}

const dirname = path.dirname(fileURLToPath(import.meta.url));
const issueScript = path.resolve(dirname, "./issue-token.mjs");
const workerScript = path.resolve(dirname, "./worker.mjs");

const issueResult = spawnSync(process.execPath, [issueScript], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
  env: process.env,
});

if (issueResult.status !== 0) {
  process.stderr.write(issueResult.stderr || "Failed to issue broker token\n");
  process.exit(issueResult.status ?? 1);
}

const token = issueResult.stdout.trim();
if (!token) {
  process.stderr.write("Issuer returned empty token\n");
  process.exit(1);
}

const command = process.argv.slice(2);
const workerArgs = [workerScript, ...command];
const workerResult = spawnSync(process.execPath, workerArgs, {
  stdio: "inherit",
  env: {
    ...process.env,
    DV_BROKER_TOKEN: token,
  },
});

process.exit(workerResult.status ?? 1);
