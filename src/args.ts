import type { ChainName, GlobalOptions } from "./types.js";

const KNOWN_COMMANDS = new Set(["check", "list", "run", "issue-token", "help", "--help", "-h"]);

interface ParsedArgv {
  command: string;
  options: GlobalOptions;
  childCommand: string[];
}

const DEFAULT_OPTIONS: GlobalOptions = {
  map: [],
};

function parseChain(value: string): ChainName {
  if (value === "base" || value === "ethereum" || value === "arbitrum" || value === "optimism") {
    return value;
  }

  throw new Error(`Invalid --chain value: \"${value}\"`);
}

function readValue(args: string[], index: number, key: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${key}`);
  }

  return value;
}

export function parseArgv(argv: string[]): ParsedArgv {
  const args = [...argv];
  const first = args[0] ?? "help";

  if (!KNOWN_COMMANDS.has(first)) {
    throw new Error(`Unknown command: ${first}`);
  }

  const command = first === "--help" || first === "-h" ? "help" : first;
  const options: GlobalOptions = { ...DEFAULT_OPTIONS, map: [] };
  const childCommand: string[] = [];

  for (let index = 1; index < args.length; index += 1) {
    const token = args[index];

    if (token === "--" && command === "run") {
      childCommand.push(...args.slice(index + 1));
      break;
    }

    if (token === "--owner") {
      options.owner = readValue(args, index, token);
      index += 1;
      continue;
    }

    if (token === "--chain") {
      options.chain = parseChain(readValue(args, index, token));
      index += 1;
      continue;
    }

    if (token === "--chain-id") {
      const value = Number(readValue(args, index, token));
      if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`Invalid --chain-id value: ${value}`);
      }
      options.chainId = value;
      index += 1;
      continue;
    }

    if (token === "--rpc-url") {
      options.rpcUrl = readValue(args, index, token);
      index += 1;
      continue;
    }

    if (token === "--password") {
      options.password = readValue(args, index, token);
      index += 1;
      continue;
    }

    if (token === "--wallet-signature") {
      options.walletSignature = readValue(args, index, token);
      index += 1;
      continue;
    }

    if (token === "--password-stdin") {
      options.passwordStdin = true;
      continue;
    }

    if (token === "--wallet-signature-stdin") {
      options.walletSignatureStdin = true;
      continue;
    }

    if (token === "--map") {
      options.map.push(readValue(args, index, token));
      index += 1;
      continue;
    }

    if (token === "--map-file") {
      options.mapFile = readValue(args, index, token);
      index += 1;
      continue;
    }

    if (token === "--allow-missing") {
      options.allowMissing = true;
      continue;
    }

    if (token === "--broker-secret") {
      options.brokerSecret = readValue(args, index, token);
      index += 1;
      continue;
    }

    if (token === "--broker-secret-stdin") {
      options.brokerSecretStdin = true;
      continue;
    }

    if (token === "--broker-token") {
      options.brokerToken = readValue(args, index, token);
      index += 1;
      continue;
    }

    if (token === "--broker-token-stdin") {
      options.brokerTokenStdin = true;
      continue;
    }

    if (token === "--ttl-seconds") {
      const value = Number(readValue(args, index, token));
      if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`Invalid --ttl-seconds value: ${value}`);
      }
      options.ttlSeconds = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${token}`);
  }

  return { command, options, childCommand };
}

export const HELP_TEXT = `
dv-env — DeadVault runtime secret injection

Usage:
  dv-env check [options]
  dv-env list [options]
  dv-env issue-token [options]
  dv-env run [options] -- <command>

Core options:
  --owner <address>                 Vault owner address (or DV_OWNER)
  --chain <name>                    base | ethereum | arbitrum | optimism
  --chain-id <id>                   Numeric chain id (overrides --chain)
  --rpc-url <url>                   Custom RPC URL

Credential options:
  --password <value>                Master password (warn: shell history risk)
  --password-stdin                  Read password from stdin (recommended)
  --wallet-signature <sig>          Wallet signature (required for v2 vaults)
  --wallet-signature-stdin          Read wallet signature from stdin

Broker options:
  --broker-secret <value>           HMAC secret for broker token signing/verify
  --broker-secret-stdin             Read broker secret from stdin
  --broker-token <value>            Short-lived token for token-based run mode
  --broker-token-stdin              Read broker token from stdin
  --ttl-seconds <n>                 Token TTL for issue-token (default: 300)

Mapping options (run):
  --map <ENV:Label>                 Inline mapping, repeatable
  --map-file <path>                 JSON map file { "ENV": "Label" }
  --allow-missing                   Continue even if mapping not found

Examples:
  echo "$DV_MASTER_PASSWORD" | dv-env check --owner 0xabc --password-stdin
  echo "$DV_MASTER_PASSWORD" | dv-env list --owner 0xabc --password-stdin
  printf "%s\n%s\n" "$DV_MASTER_PASSWORD" "$DV_BROKER_SECRET" | dv-env issue-token --owner 0xabc --password-stdin --broker-secret-stdin --map OPENAI_API_KEY:OpenAI
  echo "$DV_MASTER_PASSWORD" | dv-env run --owner 0xabc --password-stdin --map OPENAI_API_KEY:OpenAI -- node app.js
  DV_BROKER_SECRET=secret dv-env run --broker-token "$DV_BROKER_TOKEN" -- node app.js
`;
