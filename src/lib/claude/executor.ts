import { spawn } from "child_process";
import path from "path";
import { getClaudeDocsPath } from "@/lib/config";

export interface ClaudeResult {
  output: string;
  error?: string;
  exitCode: number;
}

/**
 * Executa o Claude Code CLI.
 * O cwd é SEMPRE o ClaudeDocs raiz para que o Claude Code encontre:
 * - .claude/agents/, .claude/rules/, .claude/skills/
 * - scripts/ (buscar-pdf.py, indexadores, etc.)
 * - CLAUDE.md
 * - modelos/
 *
 * A pasta do processo é adicionada via --add-dir.
 */
export async function runClaude(params: {
  prompt: string;
  processNumber?: string;
  cwd?: string;
  model?: string;
  onChunk?: (text: string) => void;
}): Promise<ClaudeResult> {
  const CLAUDE_DOCS_PATH = getClaudeDocsPath();
  const cwd = params.cwd ?? CLAUDE_DOCS_PATH;

  const args = [
    "--print",
    "--output-format", "text",
    "--permission-mode", "acceptEdits",
    "--allowedTools", "Edit", "Write", "Read", "Bash", "Glob", "Grep",
    "WebFetch", "WebSearch", "Agent",
  ];

  // Add process directory so Claude can access process files
  if (params.processNumber) {
    const processDir = path.join(CLAUDE_DOCS_PATH, "processos", params.processNumber);
    args.push("--add-dir", processDir);
  }

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
