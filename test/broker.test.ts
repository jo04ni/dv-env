import { describe, expect, it } from "vitest";
import { createBrokerToken, verifyBrokerToken } from "../src/broker.js";

describe("broker token", () => {
  it("creates and verifies token claims", () => {
    const token = createBrokerToken({ OPENAI_API_KEY: "sk-test" }, "broker-secret", 300);
    const claims = verifyBrokerToken(token, "broker-secret");

    expect(claims.env.OPENAI_API_KEY).toBe("sk-test");
    expect(claims.exp).toBeGreaterThan(claims.iat);
  });

  it("rejects token with wrong signature", () => {
    const token = createBrokerToken({ OPENAI_API_KEY: "sk-test" }, "broker-secret", 300);
    expect(() => verifyBrokerToken(token, "wrong-secret")).toThrow("Invalid broker token signature");
  });

  it("rejects expired token", () => {
    const token = createBrokerToken({ OPENAI_API_KEY: "sk-test" }, "broker-secret", 1);
    const parts = token.split(".");
    const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
    payload.exp = 1;
    const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    const tampered = `${parts[0]}.${encodedPayload}.${parts[2]}`;
    expect(() => verifyBrokerToken(tampered, "broker-secret")).toThrow();
  });
});
