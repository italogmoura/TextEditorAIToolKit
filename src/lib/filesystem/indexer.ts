import { spawn } from "child_process";
import path from "path";
import { getClaudeDocsPath } from "@/lib/config";

const CLAUDE_DOCS_PATH = getClaudeDocsPath();

export type IndexerType = "eproc" | "unico";

export interface IndexerResult {
  success: boolean;
  output: string;
  error?: string;
  indexPath?: string;
}

/**
 * Wrapper dos indexadores Python existentes.
 * Executa indexador-eproc.py ou indexador-unico.py na pasta docs/ do processo.
 */
export async function runIndexer(params: {
  processNumber: string;
  type: IndexerType;
  onChunk?: (text: string) => void;
}): Promise<IndexerResult> {
  const scriptName = params.type === "eproc" ? "indexador-eproc.py" : "indexador-unico.py";
  const scriptPath = path.join(CLAUDE_DOCS_PATH, "scripts", scriptName);
  const processDir = path.join(CLAUDE_DOCS_PATH, "processos", params.processNumber);
  const docsDir = path.join(processDir, "docs");

  return new Promise((resolve) => {
    const proc = spawn("python3", [scriptPath, docsDir], {
      cwd: processDir,
      env: { ...process.env },
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
      const indexFile = params.type === "eproc" ? "indice-eproc.md" : "indice-unico.md";
      resolve({
        success: code === 0,
        output: stdout.trim(),
        error: stderr.trim() || undefined,
        indexPath: path.join(docsDir, indexFile),
      });
    });

    proc.on("error", (err) => {
      resolve({
        success: false,
        output: "",
        error: err.message,
      });
    });
  });
}
