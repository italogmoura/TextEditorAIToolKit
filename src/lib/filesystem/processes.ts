import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import type { ProcessInfo, ProcessDocument, ProcessStatus } from "@/lib/types/process";
import { getClaudeDocsPath } from "@/lib/config";

function getProcessosDir() {
  return path.join(getClaudeDocsPath(), "processos");
}

async function existsAsync(p: string): Promise<boolean> {
  try {
    await fsp.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readdirSafe(dir: string): Promise<string[]> {
  try {
    return await fsp.readdir(dir);
  } catch {
    return [];
  }
}

async function getProcessStatus(processPath: string): Promise<ProcessStatus> {
  const docsDir = path.join(processPath, "docs");
  const pecasDir = path.join(processPath, "pecas");

  const [hasIndexEproc, hasIndexUnico, pecasFiles, gdocsMetaExists] = await Promise.all([
    existsAsync(path.join(docsDir, "indice-eproc.md")),
    existsAsync(path.join(docsDir, "indice-unico.md")),
    readdirSafe(pecasDir),
    existsAsync(path.join(processPath, ".gdocs-meta.json")),
  ]);

  const hasIndex = hasIndexEproc || hasIndexUnico;
  const hasPecas = pecasFiles.some((f) => f.endsWith(".md") || f.endsWith(".docx"));

  if (gdocsMetaExists) {
    try {
      const meta = JSON.parse(await fsp.readFile(path.join(processPath, ".gdocs-meta.json"), "utf-8"));
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

// Cache em memória para evitar chamadas repetidas ao filesystem (especialmente iCloud)
let listCache: { data: ProcessInfo[]; ts: number } | null = null;
const CACHE_TTL_MS = 5_000;

export async function listProcesses(): Promise<ProcessInfo[]> {
  if (listCache && Date.now() - listCache.ts < CACHE_TTL_MS) {
    return listCache.data;
  }

  const processosDir = getProcessosDir();
  if (!(await existsAsync(processosDir))) {
    return [];
  }

  const entries = await fsp.readdir(processosDir, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith("."));

  const results = await Promise.all(
    dirs.map(async (e) => {
      const processPath = path.join(processosDir, e.name);
      const pecasDir = path.join(processPath, "pecas");
      const docsDir = path.join(processPath, "docs");

      const [pecasFiles, rootFiles, docsFiles, hasIndexEproc, hasIndexUnico, status] =
        await Promise.all([
          readdirSafe(pecasDir),
          readdirSafe(processPath),
          readdirSafe(docsDir),
          existsAsync(path.join(docsDir, "indice-eproc.md")),
          existsAsync(path.join(docsDir, "indice-unico.md")),
          getProcessStatus(processPath),
        ]);

      const pecasCount = pecasFiles.filter((f) => !f.startsWith(".")).length;
      const pdfsCount =
        rootFiles.filter((f) => f.toLowerCase().endsWith(".pdf")).length +
        docsFiles.filter((f) => f.toLowerCase().endsWith(".pdf")).length;

      return {
        number: e.name,
        path: processPath,
        hasPecas: pecasCount > 0,
        hasIndex: hasIndexEproc || hasIndexUnico,
        pecasCount,
        pdfsCount,
        status,
      };
    })
  );

  const sorted = results.sort((a, b) => b.number.localeCompare(a.number));
  listCache = { data: sorted, ts: Date.now() };
  return sorted;
}

export function getProcessDocuments(processNumber: string): ProcessDocument[] {
  const processPath = path.join(getProcessosDir(), processNumber);
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
