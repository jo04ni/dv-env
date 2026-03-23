import { describe, expect, it } from "vitest";
import { parseArgv } from "../src/args.js";

describe("parseArgv", () => {
  it("parses check command", () => {
    const parsed = parseArgv(["check", "--owner", "0xabc", "--password", "pw"]);
    expect(parsed.command).toBe("check");
    expect(parsed.options.owner).toBe("0xabc");
  });

  it("parses run command and child args after --", () => {
    const parsed = parseArgv([
      "run",
      "--owner",
      "0xabc",
      "--password-stdin",
      "--map",
      "OPENAI_API_KEY:OpenAI",
      "--",
      "node",
      "app.js",
    ]);

    expect(parsed.command).toBe("run");
    expect(parsed.options.map).toEqual(["OPENAI_API_KEY:OpenAI"]);
    expect(parsed.childCommand).toEqual(["node", "app.js"]);
  });

  it("throws on unknown option", () => {
    expect(() => parseArgv(["check", "--nope"]))
      .toThrow("Unknown option");
  });

  it("parses issue-token command with broker settings", () => {
    const parsed = parseArgv([
      "issue-token",
      "--owner",
      "0xabc",
      "--password-stdin",
      "--broker-secret-stdin",
      "--ttl-seconds",
      "120",
      "--map",
      "OPENAI_API_KEY:OpenAI",
    ]);

    expect(parsed.command).toBe("issue-token");
    expect(parsed.options.ttlSeconds).toBe(120);
    expect(parsed.options.brokerSecretStdin).toBe(true);
  });
});
