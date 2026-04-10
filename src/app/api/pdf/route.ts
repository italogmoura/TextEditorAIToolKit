import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getClaudeDocsPath } from "@/lib/config";
import { Readable } from "stream";

const CLAUDE_DOCS_PATH = getClaudeDocsPath();

function validatePath(filePath: string | null): { resolved: string } | NextResponse {
  if (!filePath) {
    return NextResponse.json({ error: "path é obrigatório" }, { status: 400 });
  }
  const resolved = path.resolve(filePath);
  const allowedBase = path.resolve(path.join(CLAUDE_DOCS_PATH, "processos"));
  if (!resolved.startsWith(allowedBase)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }
  if (!fs.existsSync(resolved)) {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }
  return { resolved };
}

// HEAD — pdf.js faz HEAD primeiro para descobrir Content-Length e Accept-Ranges
export async function HEAD(request: NextRequest) {
  const result = validatePath(request.nextUrl.searchParams.get("path"));
  if (result instanceof NextResponse) return result;

  const stat = fs.statSync(result.resolved);
  return new NextResponse(null, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": stat.size.toString(),
      "Accept-Ranges": "bytes",
    },
  });
}

export async function GET(request: NextRequest) {
  const result = validatePath(request.nextUrl.searchParams.get("path"));
  if (result instanceof NextResponse) return result;

  const { resolved } = result;
  const stat = fs.statSync(resolved);
  const fileSize = stat.size;
  const rangeHeader = request.headers.get("range");

  // Suporte a Range requests — essencial para PDFs grandes (pdf.js usa isso)
  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : Math.min(start + 2 * 1024 * 1024 - 1, fileSize - 1);
      const chunkSize = end - start + 1;

      const stream = fs.createReadStream(resolved, { start, end });
      const webStream = Readable.toWeb(stream) as ReadableStream;

      return new NextResponse(webStream, {
        status: 206,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Length": chunkSize.toString(),
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
        },
      });
    }
  }

  // Resposta completa (com Accept-Ranges para que pdf.js saiba que pode usar range)
  const stream = fs.createReadStream(resolved);
  const webStream = Readable.toWeb(stream) as ReadableStream;

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": fileSize.toString(),
      "Content-Disposition": `inline; filename="${path.basename(resolved)}"`,
      "Accept-Ranges": "bytes",
    },
  });
}
