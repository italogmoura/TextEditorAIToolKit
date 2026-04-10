import { spawn, type ChildProcess } from "child_process";
import path from "path";
import { buildPromptContext, assemblePrompt } from "./prompt-builder";
import { StreamBuffer, type StreamEvent } from "./stream-parser";
import { db } from "@/lib/db/client";
import { agentRuns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const CLAUDE_DOCS_PATH = process.env.CLAUDE_DOCS_PATH ?? "";

// Track running processes for cleanup
const runningProcesses = new Map<string, ChildProcess>();

export interface AgentRunConfig {
  agentName: string;
  processNumber: string;
  gdocsId?: string;
  prompt?: string;
  onEvent?: (event: StreamEvent) => void;
  onChunk?: (text: string) => void;
}

export interface AgentRunResult {
  runId: string;
  output: string;
  error?: string;
  exitCode: number;
  durationMs: number;
}

/**
 * Executa um agente do Claude Code com contexto completo do processo.
 * Injeta texto do Google Docs no prompt quando disponível.
 */
export async function executeAgent(config: AgentRunConfig): Promise<AgentRunResult> {
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  // Log start in DB
  await db.insert(agentRuns).values({
    id: runId,
    processNumber: config.processNumber,
    agentName: config.agentName,
    documentName: config.gdocsId ?? "processo",
    status: "running",
    startedAt,
  });

  try {
    // Build context with GDocs content
    const context = await buildPromptContext({
      processNumber: config.processNumber,
      gdocsId: config.gdocsId,
      includeDocument: true,
    });

    const prompt = config.prompt
      ? assemblePrompt(context, config.prompt)
      : assemblePrompt(context, `Execute a análise conforme seu papel de ${config.agentName}.`);

    // Determine working directory
    const cwd = path.join(CLAUDE_DOCS_PATH, "processos", config.processNumber);

    // Build CLI args
    const args = [
      "--print",
      "--output-format", "text",
      "--allowedTools", "Edit", "Write", "Read", "Bash", "Glob", "Grep",
      "WebFetch", "WebSearch", "Agent",
    ];

    // Use agent if it's a known agent name
    const knownAgents = [
      "pesquisador-documental", "validador-probatorio", "critico-judicial",
      "revisor-completude", "revisor-estilo", "analista-prescricao",
      "indexador", "arquiteto-fluxo-claude",
    ];

    if (knownAgents.includes(config.agentName)) {
      args.push("--agent", config.agentName);
    }

    args.push("-p", prompt);

    // Spawn process
    const proc = spawn("claude", args, {
      cwd,
      env: { ...process.env },
      stdio: ["pipe", "pipe", "pipe"],
    });

    runningProcesses.set(runId, proc);

    // Stream parser
    const streamBuffer = new StreamBuffer((event) => {
      config.onEvent?.(event);
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      config.onChunk?.(text);
      streamBuffer.push(text);
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        proc.kill("SIGTERM");
        resolve(finalize(runId, startedAt, stdout, "Timeout: agente excedeu 10 minutos", 124));
      }, 10 * 60 * 1000);

      proc.on("close", (code) => {
        clearTimeout(timeout);
        runningProcesses.delete(runId);
        streamBuffer.flush();
        resolve(finalize(runId, startedAt, stdout, stderr || undefined, code ?? 1));
      });

      proc.on("error", (err) => {
        clearTimeout(timeout);
        runningProcesses.delete(runId);
        resolve(finalize(runId, startedAt, "", err.message, 1));
      });
    });
  } catch (error) {
    return finalize(runId, startedAt, "", `${error}`, 1);
  }
}

async function finalize(
  runId: string,
  startedAt: string,
  output: string,
  error: string | undefined,
  exitCode: number
): Promise<AgentRunResult> {
  const completedAt = new Date().toISOString();
  const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();

  await db
    .update(agentRuns)
    .set({
      status: exitCode === 0 ? "completed" : "failed",
      outputSummary: output.substring(0, 500),
      outputFull: { output, error },
      completedAt,
      durationMs,
    })
    .where(eq(agentRuns.id, runId));

  return { runId, output: output.trim(), error, exitCode, durationMs };
}

/**
 * Executa o workflow /revisar: 4 agentes em paralelo.
 */
export async function executeReviewWorkflow(params: {
  processNumber: string;
  gdocsId?: string;
  onEvent?: (agentName: string, event: StreamEvent) => void;
}): Promise<{
  workflowRunId: string;
  results: Record<string, AgentRunResult>;
}> {
  const workflowRunId = crypto.randomUUID();

  const reviewAgents = [
    "validador-probatorio",
    "critico-judicial",
    "revisor-completude",
    "revisor-estilo",
  ];

  // Run all 4 in parallel
  const promises = reviewAgents.map((agentName) =>
    executeAgent({
      agentName,
      processNumber: params.processNumber,
      gdocsId: params.gdocsId,
      onEvent: (event) => params.onEvent?.(agentName, event),
    })
  );

  const results = await Promise.all(promises);

  const resultMap: Record<string, AgentRunResult> = {};
  reviewAgents.forEach((name, i) => {
    resultMap[name] = results[i];
  });

  // Update workflow_run_id in all agent_runs
  for (const result of results) {
    await db
      .update(agentRuns)
      .set({ workflowName: "revisar", workflowRunId })
      .where(eq(agentRuns.id, result.runId));
  }

  return { workflowRunId, results: resultMap };
}

/**
 * Mata todos os processos Claude Code em execução (cleanup).
 */
export function killAllRunningAgents() {
  for (const [runId, proc] of runningProcesses) {
    proc.kill("SIGTERM");
    runningProcesses.delete(runId);
  }
}
