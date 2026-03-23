import { DeadVault } from "@deadvault/sdk";
import type { VaultData } from "@deadvault/sdk";
import type { GlobalOptions, SecretMapping } from "./types.js";
import { parseInlineMappings, parseMapFile, mergeMappings } from "./mapping.js";
import { resolveBrokerSecret, resolveBrokerToken, resolveCredentials } from "./credentials.js";
import { info } from "./output.js";
import { runChild } from "./runner.js";
import { createBrokerToken, verifyBrokerToken } from "./broker.js";

function createClient(options: GlobalOptions): DeadVault {
  return new DeadVault({
    chain: options.chain,
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });
}

function requireWalletSignatureIfV2Error(error: unknown): never {
  const text = error instanceof Error ? error.message : String(error);
  if (text.toLowerCase().includes("v2") && text.toLowerCase().includes("signature")) {
    throw new Error("Wallet signature missing for v2 vault. Provide --wallet-signature, --wallet-signature-stdin, or DV_WALLET_SIGNATURE.");
  }

  throw error instanceof Error ? error : new Error(String(error));
}

async function readVaultData(options: GlobalOptions): Promise<{ data: VaultData; owner: string }> {
  const credentials = await resolveCredentials(options);
  const client = createClient(options);

  try {
    const data = await client.read({
      address: credentials.owner,
      password: credentials.password,
      walletSignature: credentials.walletSignature,
    });
    return { data, owner: credentials.owner };
  } catch (error) {
    requireWalletSignatureIfV2Error(error);
  }
}

export async function runCheck(options: GlobalOptions): Promise<void> {
  const credentials = await resolveCredentials(options);
  const client = createClient(options);

  const hasVault = await client.hasVault(credentials.owner);
  if (!hasVault) {
    throw new Error("No vault found for owner on selected chain.");
  }

  try {
    await client.read({
      address: credentials.owner,
      password: credentials.password,
      walletSignature: credentials.walletSignature,
    });
  } catch (error) {
    requireWalletSignatureIfV2Error(error);
  }

  info("check: OK — vault reachable and decrypt succeeded.");
}

export async function runList(options: GlobalOptions): Promise<void> {
  const { data } = await readVaultData(options);

  if (data.entries.length === 0) {
    info("list: Vault is empty.");
    return;
  }

  for (const entry of data.entries) {
    const type = entry.type ?? "password";
    const category = entry.category ?? "uncategorized";
    info(`${entry.label} | type=${type} | category=${category}`);
  }
}

export async function loadMappings(options: GlobalOptions): Promise<SecretMapping[]> {
  const inlineMappings = parseInlineMappings(options.map);
  const fileMappings = options.mapFile ? await parseMapFile(options.mapFile) : [];
  const mappings = mergeMappings(inlineMappings, fileMappings);

  if (mappings.length === 0) {
    throw new Error("No mappings provided. Use --map or --map-file for dv-env run.");
  }

  return mappings;
}

export function resolveEnvValues(
  data: VaultData,
  mappings: SecretMapping[],
  allowMissing = false,
): { envValues: Record<string, string>; missingLabels: string[] } {
  const envValues: Record<string, string> = {};
  const missingLabels: string[] = [];

  for (const mapping of mappings) {
    const entry = data.entries.find((item) =>
      item.label.toLowerCase().includes(mapping.label.toLowerCase()),
    );

    if (!entry) {
      missingLabels.push(mapping.label);
      continue;
    }

    envValues[mapping.envName] = entry.secret;
  }

  if (!allowMissing && missingLabels.length > 0) {
    throw new Error(
      `Missing required mappings: ${missingLabels.join(", ")}. Use --allow-missing to continue anyway.`,
    );
  }

  return { envValues, missingLabels };
}

export async function runWithInjectedEnv(options: GlobalOptions, childCommand: string[]): Promise<number> {
  if (options.brokerToken || options.brokerTokenStdin || process.env.DV_BROKER_TOKEN) {
    const brokerSecret = await resolveBrokerSecret(options);
    const brokerToken = await resolveBrokerToken(options);
    const claims = verifyBrokerToken(brokerToken, brokerSecret);

    const env = {
      ...process.env,
      ...claims.env,
    };

    return runChild(childCommand, env);
  }

  const credentials = await resolveCredentials(options);
  const client = createClient(options);
  const mappings = await loadMappings(options);

  let data: VaultData;
  try {
    data = await client.read({
      address: credentials.owner,
      password: credentials.password,
      walletSignature: credentials.walletSignature,
    });
  } catch (error) {
    requireWalletSignatureIfV2Error(error);
  }

  const { envValues, missingLabels } = resolveEnvValues(data, mappings, options.allowMissing === true);

  if (missingLabels.length > 0 && options.allowMissing) {
    info(`run: Continuing with missing mappings: ${missingLabels.join(", ")}`);
  }

  const env = {
    ...process.env,
    ...envValues,
  };

  return runChild(childCommand, env);
}

export async function runIssueToken(options: GlobalOptions): Promise<void> {
  const credentials = await resolveCredentials(options);
  const brokerSecret = await resolveBrokerSecret(options);
  const mappings = await loadMappings(options);
  const client = createClient(options);

  let data: VaultData;
  try {
    data = await client.read({
      address: credentials.owner,
      password: credentials.password,
      walletSignature: credentials.walletSignature,
    });
  } catch (error) {
    requireWalletSignatureIfV2Error(error);
  }

  const { envValues, missingLabels } = resolveEnvValues(data, mappings, options.allowMissing === true);
  if (missingLabels.length > 0 && options.allowMissing) {
    info(`issue-token: Continuing with missing mappings: ${missingLabels.join(", ")}`);
  }

  const ttl = options.ttlSeconds ?? 300;
  const token = createBrokerToken(envValues, brokerSecret, ttl);
  process.stdout.write(`${token}\n`);
}
