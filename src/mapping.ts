import { readFile } from "node:fs/promises";
import type { SecretMapping } from "./types.js";

function parsePair(pair: string): SecretMapping {
  const index = pair.indexOf(":");
  if (index <= 0 || index >= pair.length - 1) {
    throw new Error(`Invalid mapping \"${pair}\". Expected ENV_NAME:VaultLabel`);
  }

  const envName = pair.slice(0, index).trim();
  const label = pair.slice(index + 1).trim();

  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(envName)) {
    throw new Error(`Invalid env var name in mapping: \"${envName}\"`);
  }

  if (!label) {
    throw new Error(`Missing vault label in mapping: \"${pair}\"`);
  }

  return { envName, label };
}

export function parseInlineMappings(pairs: string[]): SecretMapping[] {
  return pairs.map(parsePair);
}

export async function parseMapFile(path: string): Promise<SecretMapping[]> {
  const text = await readFile(path, "utf8");
  const parsed = JSON.parse(text) as unknown;

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Mapping file must be a JSON object: { \"ENV\": \"VaultLabel\" }");
  }

  const mappings: SecretMapping[] = [];

  for (const [envName, label] of Object.entries(parsed)) {
    if (typeof label !== "string") {
      throw new Error(`Mapping file value for ${envName} must be a string`);
    }

    mappings.push(parsePair(`${envName}:${label}`));
  }

  return mappings;
}

export function mergeMappings(primary: SecretMapping[], secondary: SecretMapping[]): SecretMapping[] {
  const merged = new Map<string, SecretMapping>();

  for (const item of secondary) {
    merged.set(item.envName, item);
  }

  for (const item of primary) {
    merged.set(item.envName, item);
  }

  return Array.from(merged.values());
}
