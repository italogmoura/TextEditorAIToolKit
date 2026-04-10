import { NextRequest, NextResponse } from "next/server";
import { getDocumentContent } from "@/lib/gdocs/client";

export interface OutlineItem {
  level: number;
  text: string;
  index: number;
  headingId?: string;
}

export async function GET(request: NextRequest) {
  const docId = request.nextUrl.searchParams.get("docId");

  if (!docId) {
    return NextResponse.json({ error: "docId é obrigatório" }, { status: 400 });
  }

  try {
    const doc = await getDocumentContent(docId);
    const content = doc.body?.content ?? [];
    const outline: OutlineItem[] = [];

    // Mapa de estilos do Google Docs para nível de heading
    const styleToLevel: Record<string, number> = {
      TITLE: 1,
      SUBTITLE: 2,
    };

    for (const element of content) {
      if (!element.paragraph) continue;

      const style = element.paragraph.paragraphStyle?.namedStyleType;
      if (!style) continue;

      let level: number | undefined;

      if (style.startsWith("HEADING_")) {
        level = parseInt(style.replace("HEADING_", ""), 10);
        if (isNaN(level)) continue;
      } else if (style in styleToLevel) {
        level = styleToLevel[style];
      } else {
        continue;
      }

      const text = element.paragraph.elements
        ?.map((e) => e.textRun?.content ?? "")
        .join("")
        .trim();

      if (!text) continue;

      const headingId = element.paragraph.paragraphStyle?.headingId;

      outline.push({
        level,
        text,
        index: element.startIndex ?? 0,
        ...(headingId && { headingId }),
      });
    }

    return NextResponse.json({ outline });
  } catch (error) {
    return NextResponse.json({ error: `${error}` }, { status: 500 });
  }
}
