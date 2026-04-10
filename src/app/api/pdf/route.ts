import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getClaudeDocsPath } from "@/lib/config";

const CLAUDE_DOCS_PATH = getClaudeDocsPath();

export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get("path");

  if (!filePath) {
    return NextResponse.json({ error: "path é obrigatório" }, { status: 400 });
  }

  // Security: only allow files within ClaudeDocs/processos
  const resolved = path.resolve(filePath);
  const allowedBase = path.resolve(path.join(CLAUDE_DOCS_PATH, "processos"));

  if (!resolved.startsWith(allowedBase)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  if (!fs.existsSync(resolved)) {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }

  const buffer = fs.readFileSync(resolved);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${path.basename(resolved)}"`,
    },
  });
}
