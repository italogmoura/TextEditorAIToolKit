import fs from "fs";
import path from "path";
import type { ProcessInfo, ProcessDocument, ProcessStatus } from "@/lib/types/process";

const CLAUDE_DOCS_PATH = process.env.CLAUDE_DOCS_PATH ?? "";
const PROCESSOS_DIR = path.join(CLAUDE_DOCS_PATH, "processos");

function getProcessStatus(processPath: string): ProcessStatus {
  const docsDir = path.join(processPath, "docs");
  const pecasDir = path.join(processPath, "pecas");

  const hasIndex =
    (fs.existsSync(path.join(docsDir, "indice-eproc.md")) ||
      fs.existsSync(path.join(docsDir, "indice-unico.md")));

  const hasPecas =
    fs.existsSync(pecasDir) &&
    fs.readdirSync(pecasDir).some((f) => f.endsWith(".md") || f.endsWith(".docx"));

  const gdocsMeta = path.join(processPath, ".gdocs-meta.json");
  const hasGdocsMeta = fs.existsSync(gdocsMeta);

  if (hasGdocsMeta) {
    try {
      const meta = JSON.parse(fs.readFileSync(gdocsMeta, "utf-8"));
      const anyFiled = Object.values(meta).some(
        (v: unknown) => (v as { status?: string })?.status === "filed"
      );
      if (anyFiled) return "protocolado";
    } catch {
      // ignore parse errors
    }
  }

  if (hasPecas) return "elaborando";
  if (hasIndex) return "indexado";
  return "novo";
}

export function listProcesses(): ProcessInfo[] {
  if (!fs.existsSync(PROCESSOS_DIR)) {
    return [];
  }

  const entries = fs.readdirSync(PROCESSOS_DIR, { withFileTypes: true });

  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => {
      const processPath = path.join(PROCESSOS_DIR, e.name);
      const pecasDir = path.join(processPath, "pecas");

      const pecasCount = fs.existsSync(pecasDir)
        ? fs.readdirSync(pecasDir).filter((f) => !f.startsWith(".")).length
        : 0;

      const pdfsCount = fs.existsSync(processPath)
        ? fs.readdirSync(processPath).filter((f) => f.toLowerCase().endsWith(".pdf")).length
        : 0;

      const docsDir = path.join(processPath, "docs");
      const docsPdfs = fs.existsSync(docsDir)
        ? fs.readdirSync(docsDir).filter((f) => f.toLowerCase().endsWith(".pdf")).length
        : 0;

      return {
        number: e.name,
        path: processPath,
        hasPecas: pecasCount > 0,
        hasIndex:
          fs.existsSync(path.join(docsDir, "indice-eproc.md")) ||
          fs.existsSync(path.join(docsDir, "indice-unico.md")),
        pecasCount,
        pdfsCount: pdfsCount + docsPdfs,
        status: getProcessStatus(processPath),
      };
    })
    .sort((a, b) => b.number.localeCompare(a.number));
}

export function getProcessDocuments(processNumber: string): ProcessDocument[] {
  const processPath = path.join(PROCESSOS_DIR, processNumber);
  if (!fs.existsSync(processPath)) return [];

  const documents: ProcessDocument[] = [];

  // PDFs na raiz e em docs/
  for (const dir of [processPath, path.join(processPath, "docs")]) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (file.startsWith(".")) continue;
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) continue;

      const ext = path.extname(file).toLowerCase();
      let type: ProcessDocument["type"] = "other";

      if (ext === ".pdf") type = "pdf";
      else if (file.startsWith("indice-")) type = "index";
      else if (file.startsWith("notas")) type = "notes";

      if (type !== "other" || dir === processPath) {
        documents.push({
          name: file,
          path: filePath,
          type,
          sizeBytes: stat.size,
          modifiedAt: stat.mtime.toISOString(),
        });
      }
    }
  }

  // Peças em pecas/
  const pecasDir = path.join(processPath, "pecas");
  if (fs.existsSync(pecasDir)) {
    for (const file of fs.readdirSync(pecasDir)) {
      if (file.startsWith(".")) continue;
      const filePath = path.join(pecasDir, file);
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) continue;

      documents.push({
        name: file,
        path: filePath,
        type: "peca",
        sizeBytes: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      });
    }
  }

  // Carregar gdocs metadata se existir
  const gdocsMetaPath = path.join(processPath, ".gdocs-meta.json");
  if (fs.existsSync(gdocsMetaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(gdocsMetaPath, "utf-8"));
      for (const doc of documents) {
        const key = doc.name.replace(/\.[^.]+$/, "");
        if (meta[key]?.gdocsId) {
          doc.gdocsId = meta[key].gdocsId;
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  return documents;
}
