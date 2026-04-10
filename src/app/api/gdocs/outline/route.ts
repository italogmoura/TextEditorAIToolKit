import { NextRequest, NextResponse } from "next/server";
import { getDocumentContent } from "@/lib/gdocs/client";

export interface OutlineItem {
  level: number;
  text: string;
  index: number;
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

    for (const element of content) {
      if (!element.paragraph) continue;

      const style = element.paragraph.paragraphStyle?.namedStyleType;
      if (!style || !style.startsWith("HEADING_")) continue;

      const level = parseInt(style.replace("HEADING_", ""), 10);
      if (isNaN(level)) continue;

      const text = element.paragraph.elements
        ?.map((e) => e.textRun?.content ?? "")
        .join("")
        .trim();

      if (!text) continue;

      outline.push({
        level,
        text,
        index: element.startIndex ?? 0,
      });
    }

    return NextResponse.json({ outline });
  } catch (error) {
    return NextResponse.json({ error: `${error}` }, { status: 500 });
  }
}
