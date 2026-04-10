import { NextRequest, NextResponse } from "next/server";
import { executeAgent } from "@/lib/claude/agent-runner";

export async function POST(request: NextRequest) {
  const { processNumber, agentName, gdocsId, prompt } = await request.json();

  if (!processNumber || !agentName) {
    return NextResponse.json(
      { error: "processNumber e agentName são obrigatórios" },
      { status: 400 }
    );
  }

  try {
    const result = await executeAgent({
      agentName,
      processNumber,
      gdocsId,
      prompt,
    });

    return NextResponse.json({
      runId: result.runId,
      output: result.output,
      error: result.error,
      exitCode: result.exitCode,
      durationMs: result.durationMs,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Erro ao executar agente: ${error}` },
      { status: 500 }
    );
  }
}
