import { NextRequest, NextResponse } from "next/server";
import { uploadDocxAsGoogleDoc, createOrGetFolder } from "@/lib/gdocs/client";
import { logAudit } from "@/lib/db/audit";
import fs from "fs";
import path from "path";
import { getClaudeDocsPath } from "@/lib/config";

const CLAUDE_DOCS_PATH = getClaudeDocsPath();

export async function POST(request: NextRequest) {
  const { processNumber, filePath, documentName } = await request.json();

  if (!processNumber || !filePath) {
    return NextResponse.json(
      { error: "processNumber e filePath são obrigatórios" },
      { status: 400 }
    );
  }

  // Security check
  const resolved = path.resolve(filePath);
  const allowedBase = path.resolve(path.join(CLAUDE_DOCS_PATH, "processos"));
  if (!resolved.startsWith(allowedBase)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  if (!fs.existsSync(resolved)) {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }

  try {
    // Create folder structure in Google Drive
    const mpfFolder = await createOrGetFolder("MPF");
    const textEditorFolder = await createOrGetFolder("TextEditor", mpfFolder);
    const processFolder = await createOrGetFolder(processNumber, textEditorFolder);

    const docName = documentName || path.basename(filePath, path.extname(filePath));
    const title = `${processNumber} — ${docName}`;

    // Upload .docx with automatic conversion to Google Docs format
    const gdocsId = await uploadDocxAsGoogleDoc(resolved, title, processFolder);

    // Save metadata
    const processDir = path.join(CLAUDE_DOCS_PATH, "processos", processNumber);
    const metaPath = path.join(processDir, ".gdocs-meta.json");
    let meta: Record<string, unknown> = {};
    if (fs.existsSync(metaPath)) {
      meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    }
    meta[docName] = {
      gdocsId,
      gdocsRevisionId: "1",
      lastSyncedAt: new Date().toISOString(),
      status: "active",
    };
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

    await logAudit({
      processNumber,
      action: "document:migrate",
      entityType: "document",
      entityId: docName,
      metadata: { gdocsId, sourcePath: filePath },
    });

    return NextResponse.json({
      gdocsId,
      url: `https://docs.google.com/document/d/${gdocsId}/edit`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Erro na migração: ${error}` },
      { status: 500 }
    );
  }
}
