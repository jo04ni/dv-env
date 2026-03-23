#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const owner = process.env.DV_OWNER;
const password = process.env.DV_MASTER_PASSWORD;
const brokerSecret = process.env.DV_BROKER_SECRET;
const mapping = process.env.DV_MAP || "OPENAI_API_KEY:OpenAI";
const ttl = process.env.DV_TTL_SECONDS || "180";
const chain = process.env.DV_CHAIN;

if (!owner || !password || !brokerSecret) {
  process.stderr.write("Missing env vars. Required: DV_OWNER, DV_MASTER_PASSWORD, DV_BROKER_SECRET\n");
  process.exit(1);
}

const dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.resolve(dirname, "../../dist/index.js");

const args = [
  cliPath,
  "issue-token",
  "--owner",
  owner,
  "--password-stdin",
  "--broker-secret-stdin",
  "--ttl-seconds",
  ttl,
  "--map",
  mapping,
];

if (chain) {
  args.push("--chain", chain);
}

const result = spawnSync(process.execPath, args, {
  input: `${password}\n${brokerSecret}\n`,
  encoding: "utf8",
  stdio: ["pipe", "pipe", "pipe"],
  env: process.env,
});

if (result.status !== 0) {
  process.stderr.write(result.stderr || "Failed to issue token\n");
  process.exit(result.status ?? 1);
}

process.stdout.write(result.stdout.trim() + "\n");
