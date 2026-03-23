import { describe, expect, it } from "vitest";
import { mergeMappings, parseInlineMappings } from "../src/mapping.js";
import { resolveEnvValues } from "../src/commands.js";

describe("parseInlineMappings", () => {
  it("parses ENV:Label syntax", () => {
    const mappings = parseInlineMappings(["OPENAI_API_KEY:OpenAI"]);
    expect(mappings).toEqual([{ envName: "OPENAI_API_KEY", label: "OpenAI" }]);
  });

  it("throws on invalid env name", () => {
    expect(() => parseInlineMappings(["1BAD:Label"])).toThrow("Invalid env var name");
  });
});

describe("mergeMappings", () => {
  it("prefers inline mappings over file mappings", () => {
    const merged = mergeMappings(
      [{ envName: "OPENAI_API_KEY", label: "OpenAI Inline" }],
      [{ envName: "OPENAI_API_KEY", label: "OpenAI File" }],
    );

    expect(merged).toEqual([{ envName: "OPENAI_API_KEY", label: "OpenAI Inline" }]);
  });
});

describe("resolveEnvValues", () => {
  const data = {
    version: 1,
    entries: [{
      id: "1",
      label: "OpenAI Key",
      secret: "sk-test",
      createdAt: 1,
      updatedAt: 1,
    }],
  };

  it("resolves secrets into env map", () => {
    const result = resolveEnvValues(data, [{ envName: "OPENAI_API_KEY", label: "OpenAI" }]);
    expect(result.envValues.OPENAI_API_KEY).toBe("sk-test");
    expect(result.missingLabels).toEqual([]);
  });

  it("fails closed when required label is missing", () => {
    expect(() =>
      resolveEnvValues(data, [{ envName: "ANTHROPIC_API_KEY", label: "Anthropic" }], false),
    ).toThrow("Missing required mappings");
  });

  it("allows missing mappings when enabled", () => {
    const result = resolveEnvValues(
      data,
      [{ envName: "ANTHROPIC_API_KEY", label: "Anthropic" }],
      true,
    );

    expect(result.envValues).toEqual({});
    expect(result.missingLabels).toEqual(["Anthropic"]);
  });
});
