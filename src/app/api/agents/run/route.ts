import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@/lib/claude/executor";
import { db } from "@/lib/db/client";
import { agentRuns } from "@/lib/db/schema";

export async function POST(request: NextRequest) {
  const { processNumber, agentName, prompt } = await request.json();

  if (!processNumber || !agentName) {
    return NextResponse.json(
      { error: "processNumber e agentName são obrigatórios" },
      { status: 400 }
    );
  }

  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  // Log start
  await db.insert(agentRuns).values({
    id: runId,
    processNumber,
    agentName,
    documentName: "processo",
    status: "running",
    startedAt,
  });

  try {
    const result = await runAgent({
      agentName,
      processNumber,
      prompt,
    });

    const completedAt = new Date().toISOString();
    const durationMs =
      new Date(completedAt).getTime() - new Date(startedAt).getTime();

    // Update run record
    const { eq } = await import("drizzle-orm");
    await db
      .update(agentRuns)
      .set({
        status: result.exitCode === 0 ? "completed" : "failed",
        outputSummary: result.output.substring(0, 500),
        outputFull: { output: result.output, error: result.error },
        completedAt,
        durationMs,
      })
      .where(eq(agentRuns.id, runId));

    return NextResponse.json({
      runId,
      output: result.output,
      error: result.error,
      exitCode: result.exitCode,
      durationMs,
    });
  } catch (error) {
    const { eq } = await import("drizzle-orm");
    await db
      .update(agentRuns)
      .set({
        status: "failed",
        outputSummary: `Erro: ${error}`,
        completedAt: new Date().toISOString(),
      })
      .where(eq(agentRuns.id, runId));

    return NextResponse.json(
      { error: `Erro ao executar agente: ${error}` },
      { status: 500 }
    );
  }
}
