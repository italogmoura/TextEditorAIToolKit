import fs from "fs";
import path from "path";
import { getDocumentAsAnnotatedText } from "@/lib/gdocs/client";
import { getClaudeDocsPath } from "@/lib/config";

export interface PromptContext {
  systemPrompt: string;
  processContext: string;
  documentText?: string;
}

/**
 * Carrega o CLAUDE.md raiz do repositório ClaudeDocs.
 */
function loadClaudeMd(): string {
  const claudeMdPath = path.join(getClaudeDocsPath(), "CLAUDE.md");
  if (!fs.existsSync(claudeMdPath)) return "";
  return fs.readFileSync(claudeMdPath, "utf-8");
}

/**
 * Carrega o índice do processo (EPROC ou Único), se existir.
 */
function loadIndex(processNumber: string): string {
  const docsDir = path.join(getClaudeDocsPath(), "processos", processNumber, "docs");

  for (const indexFile of ["indice-eproc.md", "indice-unico.md"]) {
    const indexPath = path.join(docsDir, indexFile);
    if (fs.existsSync(indexPath)) {
      return fs.readFileSync(indexPath, "utf-8");
    }
  }
  return "";
}

/**
 * Carrega notas do processo, se existirem.
 */
function loadNotes(processNumber: string): string {
  const processDir = path.join(getClaudeDocsPath(), "processos", processNumber);
  const notes: string[] = [];

  const entries = fs.readdirSync(processDir).filter((f) => f.startsWith("notas") && f.endsWith(".md"));
  for (const entry of entries) {
    const content = fs.readFileSync(path.join(processDir, entry), "utf-8");
    notes.push(`--- ${entry} ---\n${content}`);
  }

  return notes.join("\n\n");
}

/**
 * Carrega .gdocs-meta.json do processo.
 */
function loadGdocsMeta(processNumber: string): Record<string, { gdocsId: string }> {
  const metaPath = path.join(getClaudeDocsPath(), "processos", processNumber, ".gdocs-meta.json");
  if (!fs.existsSync(metaPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(metaPath, "utf-8"));
  } catch {
    return {};
  }
}

/**
 * Monta o contexto completo para uma operação de IA no processo.
 * Inclui: índice, notas, e opcionalmente o texto do Google Doc.
 */
export async function buildPromptContext(params: {
  processNumber: string;
  gdocsId?: string;
  includeDocument?: boolean;
}): Promise<PromptContext> {
  const systemPrompt = loadClaudeMd();

  const parts: string[] = [];

  // Índice do processo
  const index = loadIndex(params.processNumber);
  if (index) {
    parts.push(`## Índice dos Autos\n\n${index}`);
  }

  // Notas
  const notes = loadNotes(params.processNumber);
  if (notes) {
    parts.push(`## Notas do Processo\n\n${notes}`);
  }

  // Texto do Google Doc (se solicitado)
  let documentText: string | undefined;
  if (params.includeDocument && params.gdocsId) {
    try {
      documentText = await getDocumentAsAnnotatedText(params.gdocsId);
      parts.push(`## Conteúdo da Peça (Google Docs)\n\n${documentText}`);
    } catch (error) {
      parts.push(`## Conteúdo da Peça\n\n[Erro ao carregar documento do Google Docs: ${error}]`);
    }
  }

  // Tenta carregar gdocsId automaticamente se não fornecido
  if (params.includeDocument && !params.gdocsId) {
    const meta = loadGdocsMeta(params.processNumber);
    const firstDoc = Object.values(meta)[0];
    if (firstDoc?.gdocsId) {
      try {
        documentText = await getDocumentAsAnnotatedText(firstDoc.gdocsId);
        parts.push(`## Conteúdo da Peça (Google Docs)\n\n${documentText}`);
      } catch {
        // silently skip
      }
    }
  }

  return {
    systemPrompt,
    processContext: parts.join("\n\n---\n\n"),
    documentText,
  };
}

/**
 * Monta o prompt final para o Claude Code, combinando contexto e mensagem do usuário.
 */
export function assemblePrompt(context: PromptContext, userMessage: string): string {
  const parts: string[] = [];

  if (context.processContext) {
    parts.push(`<contexto_do_processo>\n${context.processContext}\n</contexto_do_processo>`);
  }

  parts.push(userMessage);

  return parts.join("\n\n");
}
