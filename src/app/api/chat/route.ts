import { NextRequest, NextResponse } from "next/server";
import { runClaude } from "@/lib/claude/executor";
import { buildPromptContext, assemblePrompt } from "@/lib/claude/prompt-builder";
import { parseClaudeOutput } from "@/lib/claude/output-parser";
import { buildBatchUpdateRequests } from "@/lib/gdocs/content";
import { applyEdits, lockDocument, unlockDocument } from "@/lib/gdocs/client";
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

    const fullPrompt = assemblePrompt(context, message, !!gdocsId, processNumber);

    // Lock document during AI operation
    if (gdocsId) {
      lockDocument(gdocsId);
    }

    const result = await runClaude({
      prompt: fullPrompt,
      processNumber,
    });

    // Parse structured edits from Claude's output
    const parsed = parseClaudeOutput(result.output || "");
    let editApplied = false;
    let editError: string | undefined;

    if (parsed.edits && gdocsId) {
      try {
        console.log(`[chat] Edições recebidas do Claude:`, JSON.stringify(parsed.edits, null, 2));
        const requests = buildBatchUpdateRequests(parsed.edits);
        console.log(`[chat] Requests para Google Docs API:`, JSON.stringify(requests, null, 2));
        if (requests.length > 0) {
          await applyEdits(gdocsId, requests);
          editApplied = true;
          console.log(`[chat] ${parsed.edits.length} edição(ões) aplicada(s) ao doc ${gdocsId}`);
        }
      } catch (error) {
        editError = `Erro ao aplicar edições ao documento: ${error}`;
        console.error("[chat] Erro ao aplicar edições:", error);
      }
    }

    // Unlock document
    if (gdocsId) {
      unlockDocument(gdocsId);
    }

    await logAudit({
      processNumber,
      action: "chat:message",
      entityType: "chat",
      metadata: {
        message: message.substring(0, 200),
        gdocsId,
        exitCode: result.exitCode,
        editApplied,
      },
    });

    // Emitir saída para o terminal via Socket.io
    const io = (globalThis as Record<string, unknown>).__socketIO as
      import("socket.io").Server | undefined;
    if (io) {
      if (parsed.rawOutput) {
        io.emit("agent:chunk", {
          agentName: "chat",
          text: parsed.rawOutput,
        });
      }
      if (parsed.edits) {
        io.emit("agent:chunk", {
          agentName: "chat",
          text: `[Edições parseadas] ${JSON.stringify(parsed.edits)}`,
        });
      }
      if (editApplied) {
        io.emit("agent:chunk", {
          agentName: "chat",
          text: `[OK] Edição aplicada ao documento Google Docs`,
        });
      }
      if (editError) {
        io.emit("agent:error", {
          agentName: "chat",
          error: editError,
        });
      }
    }

    return NextResponse.json({
      response: parsed.cleanedResponse || "Sem resposta",
      rawOutput: parsed.rawOutput,
      editApplied,
      editError,
      error: result.error,
    });
  } catch (error) {
    // Ensure document is unlocked on error
    if (gdocsId) {
      unlockDocument(gdocsId);
    }
    return NextResponse.json(
      { error: `Erro interno: ${error}` },
      { status: 500 }
    );
  }
}
