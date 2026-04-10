import { NextRequest, NextResponse } from "next/server";
import { exportAsDocx } from "@/lib/gdocs/client";
import { logAudit } from "@/lib/db/audit";
import fs from "fs";
import path from "path";

const GDRIVE_PATH = process.env.GDRIVE_PETICIONAMENTO_PATH ?? "";

export async function POST(request: NextRequest) {
  const { processNumber, documentName, gdocsId } = await request.json();

  if (!processNumber || !documentName || !gdocsId) {
    return NextResponse.json(
      { error: "processNumber, documentName e gdocsId são obrigatórios" },
      { status: 400 }
    );
  }

  try {
    const fileName = `${processNumber}_${documentName}.docx`;
    let outputPath: string;

    if (GDRIVE_PATH && fs.existsSync(GDRIVE_PATH)) {
      outputPath = path.join(GDRIVE_PATH, fileName);
    } else {
      // Fallback to local data directory
      const exportDir = path.join(process.cwd(), "data", "exports");
      if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
      outputPath = path.join(exportDir, fileName);
    }

    await exportAsDocx(gdocsId, outputPath);

    await logAudit({
      processNumber,
      action: "document:export",
      entityType: "document",
      entityId: documentName,
      metadata: { gdocsId, outputPath, fileName },
    });

    return NextResponse.json({
      success: true,
      path: outputPath,
      fileName,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Erro ao exportar: ${error}` },
      { status: 500 }
    );
  }
}
