import { NextRequest, NextResponse } from "next/server";
import { executeReviewWorkflow } from "@/lib/claude/agent-runner";
import { logAudit } from "@/lib/db/audit";

export async function POST(request: NextRequest) {
  const { processNumber, workflowName, gdocsId } = await request.json();

  if (!processNumber || !workflowName) {
    return NextResponse.json(
      { error: "processNumber e workflowName são obrigatórios" },
      { status: 400 }
    );
  }

  if (workflowName !== "revisar") {
    return NextResponse.json(
      { error: `Workflow desconhecido: ${workflowName}` },
      { status: 400 }
    );
  }

  try {
    const result = await executeReviewWorkflow({
      processNumber,
      gdocsId,
    });

    await logAudit({
      processNumber,
      action: "workflow:revisar",
      entityType: "workflow",
      entityId: result.workflowRunId,
      metadata: {
        agents: Object.keys(result.results),
        statuses: Object.fromEntries(
          Object.entries(result.results).map(([k, v]) => [k, v.exitCode === 0 ? "completed" : "failed"])
        ),
      },
    });

    return NextResponse.json({
      workflowRunId: result.workflowRunId,
      results: Object.fromEntries(
        Object.entries(result.results).map(([name, r]) => [
          name,
          {
            runId: r.runId,
            output: r.output,
            error: r.error,
            exitCode: r.exitCode,
            durationMs: r.durationMs,
          },
        ])
      ),
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Erro no workflow: ${error}` },
      { status: 500 }
    );
  }
}
