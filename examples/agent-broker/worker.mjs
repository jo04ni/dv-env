#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const brokerSecret = process.env.DV_BROKER_SECRET;
const brokerToken = process.env.DV_BROKER_TOKEN;

if (!brokerSecret || !brokerToken) {
  process.stderr.write("Missing env vars. Required: DV_BROKER_SECRET, DV_BROKER_TOKEN\n");
  process.exit(1);
}

const userCommand = process.argv.slice(2);
const command = userCommand.length > 0
  ? userCommand
  : [
      process.execPath,
      "-e",
      'console.log("OPENAI_API_KEY available:", Boolean(process.env.OPENAI_API_KEY));',
    ];

const dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.resolve(dirname, "../../dist/index.js");

const result = spawnSync(
  process.execPath,
  [cliPath, "run", "--broker-token", brokerToken, "--", ...command],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DV_BROKER_SECRET: brokerSecret,
    },
  },
);

process.exit(result.status ?? 1);
