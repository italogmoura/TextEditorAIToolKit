import { exportAsDocx } from "./client";
import { logAudit } from "@/lib/db/audit";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { getClaudeDocsPath } from "@/lib/config";

const CLAUDE_DOCS_PATH = getClaudeDocsPath();
const GDRIVE_PATH = process.env.GDRIVE_PETICIONAMENTO_PATH ?? "";

/**
 * Exporta Google Doc como .docx e move para pasta de peticionamento.
 * Opcionalmente roda docx_postprocess.py para ajustes finais.
 */
export async function exportForFiling(params: {
  processNumber: string;
  documentName: string;
  gdocsId: string;
  runPostProcess?: boolean;
}): Promise<{ path: string; fileName: string }> {
  const fileName = `${params.processNumber}_${params.documentName}.docx`;

  // Determinar destino
  let outputPath: string;
  if (GDRIVE_PATH && fs.existsSync(GDRIVE_PATH)) {
    outputPath = path.join(GDRIVE_PATH, fileName);
  } else {
    const exportDir = path.join(process.cwd(), "data", "exports");
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
    outputPath = path.join(exportDir, fileName);
    console.warn(`[export] Google Drive não encontrado, exportando para ${outputPath}`);
  }

  // Exportar via Drive API
  await exportAsDocx(params.gdocsId, outputPath);

  // Pós-processamento (opcional)
  if (params.runPostProcess) {
    const postProcessScript = path.join(CLAUDE_DOCS_PATH, "scripts", "docx_postprocess.py");
    if (fs.existsSync(postProcessScript)) {
      await new Promise<void>((resolve, reject) => {
        const proc = spawn("python3", [postProcessScript, outputPath]);
        proc.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`docx_postprocess.py exited with code ${code}`));
        });
        proc.on("error", reject);
      });
    }
  }

  // Log
  await logAudit({
    processNumber: params.processNumber,
    action: "document:export",
    entityType: "document",
    entityId: params.documentName,
    metadata: { gdocsId: params.gdocsId, outputPath, fileName },
  });

  return { path: outputPath, fileName };
}
