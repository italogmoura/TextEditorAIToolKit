import { NextRequest, NextResponse } from "next/server";
import { runClaude } from "@/lib/claude/executor";
import { buildPromptContext, assemblePrompt } from "@/lib/claude/prompt-builder";
import { logAudit } from "@/lib/db/audit";
import fs from "fs";
import path from "path";
import { getClaudeDocsPath } from "@/lib/config";

const CLAUDE_DOCS_PATH = getClaudeDocsPath();

export async function POST(request: NextRequest) {
  const { processNumber, message, gdocsId } = await request.json();

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
    // Build context with GDocs content (pull sob demanda)
    const context = await buildPromptContext({
      processNumber,
      gdocsId,
      includeDocument: !!gdocsId,
    });

    const fullPrompt = assemblePrompt(context, message);

    const result = await runClaude({
      prompt: fullPrompt,
      processNumber,
    });

    await logAudit({
      processNumber,
      action: "chat:message",
      entityType: "chat",
      metadata: {
        message: message.substring(0, 200),
        gdocsId,
        exitCode: result.exitCode,
      },
    });

    return NextResponse.json({
      response: result.output || "Sem resposta",
      error: result.error,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Erro interno: ${error}` },
      { status: 500 }
    );
  }
}
