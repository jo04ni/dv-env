import { spawn } from "node:child_process";

export async function runChild(command: string[], env: NodeJS.ProcessEnv): Promise<number> {
  if (command.length === 0) {
    throw new Error("Missing child command. Use dv-env run -- <command>");
  }

  return new Promise((resolve, reject) => {
    const [file, ...args] = command;

    const child = spawn(file, args, {
      stdio: "inherit",
      env,
      shell: false,
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`Child process terminated by signal: ${signal}`));
        return;
      }

      resolve(code ?? 1);
    });
  });
}
