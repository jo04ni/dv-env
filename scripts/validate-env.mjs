#!/usr/bin/env node

function hasValue(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function checkAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function checkHexSignature(value) {
  return /^0x[a-fA-F0-9]+$/.test(value) && value.length >= 130;
}

function checkChain(value) {
  return ["base", "ethereum", "arbitrum", "optimism"].includes(value);
}

function parseMode(args) {
  const modeArg = args.find((arg) => arg.startsWith("--mode="));
  if (!modeArg) return "run";
  const mode = modeArg.split("=")[1];
  if (["run", "issue-token", "worker"].includes(mode)) return mode;
  throw new Error("Invalid mode. Use --mode=run | --mode=issue-token | --mode=worker");
}

function parseNeedSignature(args) {
  return args.includes("--require-signature");
}

function main() {
  const args = process.argv.slice(2);
  const mode = parseMode(args);
  const requireSignature = parseNeedSignature(args);

  const errors = [];
  const warnings = [];

  const owner = process.env.DV_OWNER;
  const password = process.env.DV_MASTER_PASSWORD;
  const walletSignature = process.env.DV_WALLET_SIGNATURE;
  const brokerSecret = process.env.DV_BROKER_SECRET;
  const brokerToken = process.env.DV_BROKER_TOKEN;
  const chain = process.env.DV_CHAIN;
  const ttl = process.env.DV_TTL_SECONDS;

  if (mode === "run" || mode === "issue-token") {
    if (!hasValue(owner)) errors.push("DV_OWNER is required.");
    if (!hasValue(password)) errors.push("DV_MASTER_PASSWORD is required.");

    if (hasValue(owner) && !checkAddress(owner)) {
      errors.push("DV_OWNER must be a valid EVM address (0x + 40 hex chars).");
    }

    if (requireSignature && !hasValue(walletSignature)) {
      errors.push("DV_WALLET_SIGNATURE is required when --require-signature is set.");
    }

    if (hasValue(walletSignature) && !checkHexSignature(walletSignature)) {
      warnings.push("DV_WALLET_SIGNATURE format looks unusual. Check if this is a full 0x-hex signature.");
    }
  }

  if (mode === "issue-token" || mode === "worker") {
    if (!hasValue(brokerSecret)) {
      errors.push("DV_BROKER_SECRET is required for broker modes.");
    } else if (brokerSecret.length < 24) {
      warnings.push("DV_BROKER_SECRET should be at least 24 chars (recommended: 32+ random chars).");
    }
  }

  if (mode === "worker" && !hasValue(brokerToken)) {
    errors.push("DV_BROKER_TOKEN is required in worker mode.");
  }

  if (hasValue(chain) && !checkChain(chain)) {
    errors.push("DV_CHAIN must be one of: base, ethereum, arbitrum, optimism.");
  }

  if (hasValue(ttl)) {
    const ttlNumber = Number(ttl);
    if (!Number.isInteger(ttlNumber) || ttlNumber <= 0) {
      errors.push("DV_TTL_SECONDS must be a positive integer.");
    } else if (ttlNumber > 3600) {
      warnings.push("DV_TTL_SECONDS is high (>3600). Prefer short-lived broker tokens.");
    }
  }

  if (warnings.length > 0) {
    for (const warning of warnings) {
      process.stderr.write(`Warning: ${warning}\n`);
    }
  }

  if (errors.length > 0) {
    for (const error of errors) {
      process.stderr.write(`Error: ${error}\n`);
    }
    process.exit(1);
  }

  process.stdout.write(`Environment validation passed (mode=${mode}).\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
