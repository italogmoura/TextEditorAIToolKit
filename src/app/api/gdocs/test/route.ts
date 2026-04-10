import { NextRequest, NextResponse } from "next/server";
import {
  insertTextAtEnd,
  getDocumentAsAnnotatedText,
  lockDocument,
  unlockDocument,
  exportAsDocx,
} from "@/lib/gdocs/client";
import path from "path";

// Test endpoint for Google Docs operations
export async function POST(request: NextRequest) {
  const { action, docId, text, outputPath } = await request.json();

  try {
    switch (action) {
      case "insert": {
        await insertTextAtEnd(docId, text);
        return NextResponse.json({ success: true });
      }
      case "read": {
        const content = await getDocumentAsAnnotatedText(docId);
        return NextResponse.json({ text: content });
      }
      case "lock": {
        await lockDocument(docId);
        return NextResponse.json({ success: true, message: "Document locked" });
      }
      case "unlock": {
        await unlockDocument(docId);
        return NextResponse.json({ success: true, message: "Document unlocked" });
      }
      case "export": {
        const exportPath =
          outputPath || path.join(process.cwd(), "data", "exports", "test-export.docx");
        await exportAsDocx(docId, exportPath);
        return NextResponse.json({ success: true, path: exportPath });
      }
      default:
        return NextResponse.json({ error: `Ação desconhecida: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: `${error}` }, { status: 500 });
  }
}
