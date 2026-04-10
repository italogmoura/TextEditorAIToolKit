import { NextRequest, NextResponse } from "next/server";
import { runClaude } from "@/lib/claude/executor";
import { logAudit } from "@/lib/db/audit";
import fs from "fs";
import path from "path";

const CLAUDE_DOCS_PATH = process.env.CLAUDE_DOCS_PATH ?? "";

export async function POST(request: NextRequest) {
  const { processNumber, message } = await request.json();

  if (!processNumber || !message) {
    return NextResponse.json(
      { error: "processNumber e message são obrigatórios" },
      { status: 400 }
    );
  }

  const processDir = path.join(CLAUDE_DOCS_PATH, "processos", processNumber);
  if (!fs.existsSync(processDir)) {
    return NextResponse.json(
      { error: `Processo ${processNumber} não encontrado` },
      { status: 404 }
    );
  }

  try {
    const result = await runClaude({
      prompt: message,
      cwd: processDir,
    });

    await logAudit({
      processNumber,
      action: "chat:message",
      entityType: "chat",
      metadata: {
        message: message.substring(0, 200),
        exitCode: result.exitCode,
      },
    });

    if (result.exitCode !== 0) {
      return NextResponse.json({
        response: result.output || "Erro na execução",
        error: result.error,
      });
    }

    return NextResponse.json({ response: result.output });
  } catch (error) {
    return NextResponse.json(
      { error: `Erro interno: ${error}` },
      { status: 500 }
    );
  }
}
