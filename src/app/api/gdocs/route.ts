import { NextRequest, NextResponse } from "next/server";
import {
  createDocument,
  getDocumentAsAnnotatedText,
  createOrGetFolder,
  setMinimalMargins,
} from "@/lib/gdocs/client";
import { logAudit } from "@/lib/db/audit";
import fs from "fs";
import path from "path";
import { getClaudeDocsPath } from "@/lib/config";

const CLAUDE_DOCS_PATH = getClaudeDocsPath();

// POST: Create a new Google Doc for a process
export async function POST(request: NextRequest) {
  const { processNumber, documentName, title } = await request.json();

  if (!processNumber || !documentName) {
    return NextResponse.json(
      { error: "processNumber e documentName são obrigatórios" },
      { status: 400 }
    );
  }

  try {
    // Create folder structure: MPF/TextEditor/{processNumber}
    const mpfFolder = await createOrGetFolder("MPF");
    const textEditorFolder = await createOrGetFolder("TextEditor", mpfFolder);
    const processFolder = await createOrGetFolder(processNumber, textEditorFolder);

    // Create the document
    const docId = await createDocument(
      title || `${processNumber} — ${documentName}`,
      processFolder
    );

    // Save metadata locally
    const processDir = path.join(CLAUDE_DOCS_PATH, "processos", processNumber);
    const metaPath = path.join(processDir, ".gdocs-meta.json");

    let meta: Record<string, unknown> = {};
    if (fs.existsSync(metaPath)) {
      meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    }

    meta[documentName] = {
      gdocsId: docId,
      gdocsRevisionId: "1",
      lastSyncedAt: new Date().toISOString(),
      status: "active",
    };

    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

    await logAudit({
      processNumber,
      action: "document:create",
      entityType: "document",
      entityId: documentName,
      metadata: { gdocsId: docId },
    });

    return NextResponse.json({
      gdocsId: docId,
      url: `https://docs.google.com/document/d/${docId}/edit`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Erro ao criar documento: ${error}` },
      { status: 500 }
    );
  }
}

// PATCH: Apply minimal margins to an existing Google Doc
export async function PATCH(request: NextRequest) {
  const { gdocsId } = await request.json();

  if (!gdocsId) {
    return NextResponse.json({ error: "gdocsId é obrigatório" }, { status: 400 });
  }

  try {
    await setMinimalMargins(gdocsId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: `Erro ao ajustar margens: ${error}` },
      { status: 500 }
    );
  }
}

// GET: Get annotated text from a Google Doc
export async function GET(request: NextRequest) {
  const docId = request.nextUrl.searchParams.get("docId");

  if (!docId) {
    return NextResponse.json(
      { error: "docId é obrigatório" },
      { status: 400 }
    );
  }

  try {
    const text = await getDocumentAsAnnotatedText(docId);
    return NextResponse.json({ text });
  } catch (error) {
    return NextResponse.json(
      { error: `Erro ao ler documento: ${error}` },
      { status: 500 }
    );
  }
}
