import { NextRequest, NextResponse } from "next/server";
import { exportAsHtml } from "@/lib/gdocs/client";

/**
 * GET /api/gdocs/html?docId=...
 * Exporta o Google Doc como HTML para cache no editor local.
 */
export async function GET(request: NextRequest) {
  const docId = request.nextUrl.searchParams.get("docId");
  if (!docId) {
    return NextResponse.json({ error: "docId é obrigatório" }, { status: 400 });
  }

  try {
    const html = await exportAsHtml(docId);
    return NextResponse.json({ html, exportedAt: Date.now() });
  } catch (error) {
    console.error("[gdocs/html] Erro ao exportar HTML:", error);
    return NextResponse.json(
      { error: "Erro ao exportar documento como HTML" },
      { status: 500 }
    );
  }
}
