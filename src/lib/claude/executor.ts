import { spawn } from "child_process";
import path from "path";

const CLAUDE_DOCS_PATH = process.env.CLAUDE_DOCS_PATH ?? "";

export interface ClaudeResult {
  output: string;
  error?: string;
  exitCode: number;
}

export async function runClaude(params: {
  prompt: string;
  cwd?: string;
  model?: string;
  systemPrompt?: string;
  onChunk?: (text: string) => void;
}): Promise<ClaudeResult> {
  const cwd = params.cwd ?? CLAUDE_DOCS_PATH;

  const args = ["--print", "--output-format", "text"];
  if (params.model) {
    args.push("--model", params.model);
  }
  args.push("-p", params.prompt);

  return new Promise((resolve) => {
    const proc = spawn("claude", args, {
      cwd,
      env: { ...process.env },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      params.onChunk?.(text);
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      resolve({
        output: stdout.trim(),
        error: stderr.trim() || undefined,
        exitCode: code ?? 1,
      });
    });

    proc.on("error", (err) => {
      resolve({
        output: "",
        error: err.message,
        exitCode: 1,
      });
    });

    // Timeout after 10 minutes
    setTimeout(() => {
      proc.kill("SIGTERM");
      resolve({
        output: stdout.trim(),
        error: "Timeout: operação excedeu 10 minutos",
        exitCode: 124,
      });
    }, 10 * 60 * 1000);
  });
}

export async function runAgent(params: {
  agentName: string;
  processNumber: string;
  prompt?: string;
  onChunk?: (text: string) => void;
}): Promise<ClaudeResult> {
  const processDir = path.join(CLAUDE_DOCS_PATH, "processos", params.processNumber);

  const args = [
    "--print",
    "--output-format", "text",
    "--agent", params.agentName,
  ];

  if (params.prompt) {
    args.push("-p", params.prompt);
  }

  return new Promise((resolve) => {
    const proc = spawn("claude", args, {
      cwd: processDir,
      env: { ...process.env },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      params.onChunk?.(text);
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      resolve({
        output: stdout.trim(),
        error: stderr.trim() || undefined,
        exitCode: code ?? 1,
      });
    });

    proc.on("error", (err) => {
      resolve({
        output: "",
        error: err.message,
        exitCode: 1,
      });
    });

    // Timeout after 10 minutes
    setTimeout(() => {
      proc.kill("SIGTERM");
      resolve({
        output: stdout.trim(),
        error: "Timeout: agente excedeu 10 minutos",
        exitCode: 124,
      });
    }, 10 * 60 * 1000);
  });
}
