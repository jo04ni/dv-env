#!/usr/bin/env node

import { parseArgv, HELP_TEXT } from "./args.js";
import { fail, sanitizeError } from "./output.js";
import { runCheck, runIssueToken, runList, runWithInjectedEnv } from "./commands.js";
import { getSensitiveValues } from "./credentials.js";

async function main(): Promise<void> {
  const parsed = parseArgv(process.argv.slice(2));

  if (parsed.command === "help") {
    process.stdout.write(`${HELP_TEXT}\n`);
    return;
  }

  try {
    if (parsed.command === "check") {
      await runCheck(parsed.options);
      return;
    }

    if (parsed.command === "list") {
      await runList(parsed.options);
      return;
    }

    if (parsed.command === "run") {
      const exitCode = await runWithInjectedEnv(parsed.options, parsed.childCommand);
      process.exit(exitCode);
    }

    if (parsed.command === "issue-token") {
      await runIssueToken(parsed.options);
      return;
    }
  } catch (error) {
    const sensitive = getSensitiveValues(parsed.options, {}, []);

    fail(sanitizeError(error, sensitive));
  }
}

main().catch((error) => {
  fail(sanitizeError(error, []));
});
