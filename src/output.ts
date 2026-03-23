const REDACTION = "[REDACTED]";

export function info(message: string): void {
  process.stdout.write(`${message}\n`);
}

export function warn(message: string): void {
  process.stderr.write(`Warning: ${message}\n`);
}

export function fail(message: string, exitCode = 1): never {
  process.stderr.write(`Error: ${message}\n`);
  process.exit(exitCode);
}

export function sanitizeText(input: string, sensitive: string[]): string {
  return sensitive
    .filter(Boolean)
    .reduce((acc, value) => acc.split(value).join(REDACTION), input);
}

export function sanitizeError(error: unknown, sensitive: string[]): string {
  const raw = error instanceof Error ? error.message : String(error);
  return sanitizeText(raw, sensitive);
}
