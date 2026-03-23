import { createHmac, timingSafeEqual } from "node:crypto";
import type { BrokerClaims } from "./types.js";

const HEADER = { alg: "HS256", typ: "DVENV" } as const;

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string): string {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");

  return Buffer.from(normalized, "base64").toString("utf8");
}

function sign(input: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(input)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function assertEnvShape(env: unknown): asserts env is Record<string, string> {
  if (typeof env !== "object" || env === null || Array.isArray(env)) {
    throw new Error("Invalid token payload.");
  }

  for (const [key, value] of Object.entries(env)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || typeof value !== "string") {
      throw new Error("Invalid token payload.");
    }
  }
}

export function createBrokerToken(env: Record<string, string>, secret: string, ttlSeconds = 300): string {
  if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error("ttlSeconds must be a positive integer.");
  }

  const now = Math.floor(Date.now() / 1000);
  const claims: BrokerClaims = {
    iat: now,
    exp: now + ttlSeconds,
    env,
  };

  const encodedHeader = toBase64Url(JSON.stringify(HEADER));
  const encodedPayload = toBase64Url(JSON.stringify(claims));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = sign(signingInput, secret);

  return `${signingInput}.${signature}`;
}

export function verifyBrokerToken(token: string, secret: string): BrokerClaims {
  const segments = token.split(".");
  if (segments.length !== 3) {
    throw new Error("Invalid broker token format.");
  }

  const [encodedHeader, encodedPayload, signature] = segments;
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = sign(signingInput, secret);

  const receivedBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  if (receivedBuffer.length !== expectedBuffer.length || !timingSafeEqual(receivedBuffer, expectedBuffer)) {
    throw new Error("Invalid broker token signature.");
  }

  const header = JSON.parse(fromBase64Url(encodedHeader)) as { alg?: string; typ?: string };
  if (header.alg !== "HS256" || header.typ !== "DVENV") {
    throw new Error("Invalid broker token header.");
  }

  const payload = JSON.parse(fromBase64Url(encodedPayload)) as Partial<BrokerClaims>;
  if (typeof payload.iat !== "number" || typeof payload.exp !== "number") {
    throw new Error("Invalid broker token payload.");
  }

  assertEnvShape(payload.env);

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) {
    throw new Error("Broker token expired.");
  }

  return {
    iat: payload.iat,
    exp: payload.exp,
    env: payload.env,
  };
}
