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

const GDOCS_EDIT_INSTRUCTIONS = `
<instrucoes_edicao_google_docs>
Você é um assistente que edita documentos jurídicos no Google Docs via API.
O conteúdo está anotado com índices de posição:
  [§1 idx:1-25] Título do documento
  [§2 idx:25-180] Texto do primeiro parágrafo...
  [§3 idx:180-350] Texto do segundo parágrafo...
Cada §N tem idx:START-END = posição exata no documento (startIndex inclusivo, endIndex exclusivo).

## Ações disponíveis

Emita um bloco JSON com a tag gdocs-edits. Sem ele, NADA será alterado.

\`\`\`gdocs-edits
[{"action":"insert_after","startIndex":25,"endIndex":180,"newText":"Novo parágrafo"}]
\`\`\`

1. **insert_after** — Cria novo parágrafo APÓS o §N indicado. O novo parágrafo herda a formatação (recuo, alinhamento, fonte) do parágrafo de referência.
   {"action":"insert_after","startIndex":25,"endIndex":180,"newText":"Texto novo"}

2. **replace** — Substitui o conteúdo textual do §N indicado (mantém o parágrafo, troca o texto).
   {"action":"replace","startIndex":25,"endIndex":180,"newText":"Texto substituto"}

3. **delete** — Remove o §N indicado inteiro.
   {"action":"delete","startIndex":25,"endIndex":180}

4. **style** — Altera formatação de um §N sem mudar o texto.
   {"action":"style","startIndex":25,"endIndex":180,"paragraphStyle":{"alignment":"CENTER"},"fields":"alignment"}

## Regras OBRIGATÓRIAS

1. Use EXATAMENTE os valores idx:START-END do §N alvo. NÃO invente índices.
2. Localize o parágrafo correto pelo conteúdo textual, depois use os índices DELE.
3. "Abaixo de X" ou "depois de X" → insert_after com índices do §N que contém X.
4. <texto_selecionado> → encontre qual §N contém esse trecho e use os índices dele.
5. Sempre emita o bloco \`\`\`gdocs-edits.
6. Responda de forma BREVE explicando o que fez.

## Formatação do texto

- newText é inserido como TEXTO PURO no Google Docs.
- NUNCA use Markdown: nada de #, ##, **, *, - ou crases. Escreva texto limpo.
- Cada insert_after cria UM parágrafo. Para múltiplos, use múltiplas edições separadas.
- Para múltiplas edições no mesmo bloco, ordene por índice DECRESCENTE (maiores primeiro) para não invalidar posições.

## Referência rápida: Google Docs API

### Estilos de parágrafo (paragraphStyle)
Campos disponíveis para a ação "style":
- alignment: START | CENTER | END | JUSTIFIED
- indentFirstLine: {magnitude: N, unit: "PT"} — recuo da primeira linha
- indentStart: {magnitude: N, unit: "PT"} — recuo esquerdo
- indentEnd: {magnitude: N, unit: "PT"} — recuo direito
- lineSpacing: número (100=simples, 150=1.5, 200=duplo)
- spaceAbove: {magnitude: N, unit: "PT"} — espaço antes
- spaceBelow: {magnitude: N, unit: "PT"} — espaço depois
- namedStyleType: NORMAL_TEXT | HEADING_1 | HEADING_2 | HEADING_3 | TITLE | SUBTITLE

### Estilos de texto (textStyle)
Campos disponíveis para a ação "style":
- bold, italic, underline, strikethrough: true/false
- fontSize: {magnitude: N, unit: "PT"}
- weightedFontFamily: {fontFamily: "Times New Roman"}
- foregroundColor, backgroundColor: cor RGB

### Regras de estilo
- O campo "fields" é OBRIGATÓRIO: lista quais propriedades aplicar (ex: "alignment,lineSpacing").
- Propriedades não listadas em "fields" permanecem inalteradas.
- 1 polegada = 72 PT. Recuo típico de parágrafo jurídico: indentFirstLine ~35-40 PT.

### Formatação padrão MPF
- Fonte: Times New Roman 12pt
- Alinhamento: justificado (JUSTIFIED)
- Espaçamento: 1.5 (lineSpacing: 150)
- Recuo primeira linha: ~35 PT
- Assinatura: centralizado (CENTER)
- Títulos de seção: negrito, sem recuo
</instrucoes_edicao_google_docs>`;

/**
 * Monta o prompt final para o Claude Code, combinando contexto e mensagem do usuário.
 * Quando gdocsId está presente, adiciona instruções para edição estruturada.
 */
export function assemblePrompt(context: PromptContext, userMessage: string, hasGdocs?: boolean, processNumber?: string): string {
  const parts: string[] = [];

  if (context.processContext) {
    parts.push(`<contexto_do_processo>\n${context.processContext}\n</contexto_do_processo>`);
  }

  // Informar localização dos arquivos do processo
  if (processNumber) {
    const processDir = path.join(getClaudeDocsPath(), "processos", processNumber);
    parts.push(`<localizacao_arquivos>
Pasta do processo: ${processDir}/
PDFs dos autos: arquivos .PDF diretamente em ${processDir}/ (raiz da pasta)
Índices: ${processDir}/docs/
Peças (minutas): ${processDir}/pecas/
</localizacao_arquivos>`);
  }

  if (hasGdocs) {
    parts.push(GDOCS_EDIT_INSTRUCTIONS);
  }

  parts.push(userMessage);

  return parts.join("\n\n");
}
