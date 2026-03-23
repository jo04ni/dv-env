import type { GlobalOptions, ResolvedCredentials } from "./types.js";
import { warn } from "./output.js";

let stdinLinesPromise: Promise<string[]> | undefined;

function readStdinLines(): Promise<string[]> {
  if (stdinLinesPromise) {
    return stdinLinesPromise;
  }

  stdinLinesPromise = new Promise((resolve, reject) => {
    if (process.stdin.isTTY) {
      resolve([]);
      return;
    }

    const chunks: Buffer[] = [];

    process.stdin.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    process.stdin.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      const lines = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      resolve(lines);
    });
    process.stdin.on("error", reject);
  });

  return stdinLinesPromise;
}

interface StdinInputs {
  passwordFromStdin?: string;
  walletSigFromStdin?: string;
  brokerSecretFromStdin?: string;
  brokerTokenFromStdin?: string;
}

function firstDefined(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => value && value.trim().length > 0)?.trim();
}

export async function resolveStdinInputs(options: GlobalOptions): Promise<StdinInputs> {
  if (!options.passwordStdin && !options.walletSignatureStdin && !options.brokerSecretStdin && !options.brokerTokenStdin) {
    return {};
  }

  const lines = await readStdinLines();
  let cursor = 0;

  const result: StdinInputs = {};

  if (options.passwordStdin) {
    result.passwordFromStdin = lines[cursor];
    cursor += 1;
  }

  if (options.walletSignatureStdin) {
    result.walletSigFromStdin = lines[cursor];
    cursor += 1;
  }

  if (options.brokerSecretStdin) {
    result.brokerSecretFromStdin = lines[cursor];
    cursor += 1;
  }

  if (options.brokerTokenStdin) {
    result.brokerTokenFromStdin = lines[cursor];
  }

  return result;
}

export async function resolveCredentials(options: GlobalOptions): Promise<ResolvedCredentials> {
  const owner = firstDefined(options.owner, process.env.DV_OWNER);
  if (!owner) {
    throw new Error("Missing owner address. Use --owner or DV_OWNER.");
  }

  if (options.password) {
    warn("Passing password via CLI argument can leak into shell history. Prefer --password-stdin.");
  }

  const { passwordFromStdin, walletSigFromStdin } = await resolveStdinInputs(options);

  const password = firstDefined(options.password, passwordFromStdin, process.env.DV_MASTER_PASSWORD);
  if (!password) {
    throw new Error("Missing master password. Use --password-stdin, --password, or DV_MASTER_PASSWORD.");
  }

  const walletSignature = firstDefined(options.walletSignature, walletSigFromStdin, process.env.DV_WALLET_SIGNATURE);

  return { owner, password, walletSignature };
}

export async function resolveBrokerSecret(options: GlobalOptions): Promise<string> {
  if (options.brokerSecret) {
    warn("Passing broker secret via CLI argument can leak into shell history. Prefer --broker-secret-stdin.");
  }

  const { brokerSecretFromStdin } = await resolveStdinInputs(options);
  const brokerSecret = firstDefined(options.brokerSecret, brokerSecretFromStdin, process.env.DV_BROKER_SECRET);

  if (!brokerSecret) {
    throw new Error("Missing broker secret. Use --broker-secret, --broker-secret-stdin, or DV_BROKER_SECRET.");
  }

  return brokerSecret;
}

export async function resolveBrokerToken(options: GlobalOptions): Promise<string> {
  const { brokerTokenFromStdin } = await resolveStdinInputs(options);
  const brokerToken = firstDefined(options.brokerToken, brokerTokenFromStdin, process.env.DV_BROKER_TOKEN);

  if (!brokerToken) {
    throw new Error("Missing broker token. Use --broker-token, --broker-token-stdin, or DV_BROKER_TOKEN.");
  }

  return brokerToken;
}

export function getSensitiveValues(options: GlobalOptions, resolved: Partial<ResolvedCredentials>, injectedSecrets: string[]): string[] {
  return [
    options.password,
    options.walletSignature,
    options.brokerSecret,
    options.brokerToken,
    process.env.DV_MASTER_PASSWORD,
    process.env.DV_WALLET_SIGNATURE,
    process.env.DV_BROKER_SECRET,
    process.env.DV_BROKER_TOKEN,
    resolved.password,
    resolved.walletSignature,
    ...injectedSecrets,
  ].filter((item): item is string => Boolean(item && item.length));
}
