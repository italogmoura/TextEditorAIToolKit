import { NextRequest, NextResponse } from "next/server";
import {
  getDocumentContent,
  getDocumentModifiedTime,
  applyEdits,
  exportAsHtml,
} from "@/lib/gdocs/client";
import DiffMatchPatch from "diff-match-patch";

const dmp = new DiffMatchPatch();

/**
 * POST /api/gdocs/sync-back
 * Recebe edições do editor local e sincroniza com o Google Docs.
 * Usa three-way merge via diff-match-patch quando há divergência.
 */
export async function POST(request: NextRequest) {
  try {
    const { gdocsId, htmlContent, cachedAt } = await request.json();

    if (!gdocsId || !htmlContent) {
      return NextResponse.json(
        { error: "gdocsId e htmlContent são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se o documento foi modificado desde o cache
    const modifiedTime = await getDocumentModifiedTime(gdocsId);
    const modifiedMs = new Date(modifiedTime).getTime();

    if (cachedAt && modifiedMs > cachedAt) {
      // Documento foi modificado — tentar three-way merge
      const currentHtml = await exportAsHtml(gdocsId);

      const currentText = stripHtmlToText(currentHtml);
      const localText = stripHtmlToText(htmlContent);

      const patches = dmp.patch_make(currentText, localText);

      if (patches.length === 0) {
        return NextResponse.json({ status: "synced", merged: false });
      }

      const [, results] = dmp.patch_apply(patches, currentText);
      const allApplied = results.every((r) => r);

      if (!allApplied) {
        return NextResponse.json(
          {
            status: "conflict",
            currentHtml,
            localHtml: htmlContent,
            failedPatches: results.map((r, i) => ({ index: i, applied: r })),
          },
          { status: 409 }
        );
      }

      // Merge bem-sucedido: usar o HTML local que preserva a estrutura
      await replaceDocumentFromHtml(gdocsId, htmlContent);
      return NextResponse.json({ status: "synced", merged: true });
    }

    // Sem conflito: substituir conteúdo preservando estrutura HTML
    await replaceDocumentFromHtml(gdocsId, htmlContent);
    return NextResponse.json({ status: "synced", merged: false });
  } catch (error) {
    console.error("[sync-back] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao sincronizar com Google Docs" },
      { status: 500 }
    );
  }
}

/** Bloco parseado do HTML do TipTap */
interface ParsedBlock {
  type: "heading" | "paragraph";
  level?: number; // 1-6 para headings
  segments: TextSegment[];
}

interface TextSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

/**
 * Parseia o HTML do TipTap em blocos estruturados (headings, parágrafos, inline styles).
 */
function parseTiptapHtml(html: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];

  // Separar em blocos por tags de bloco (h1-h6, p)
  const blockRegex = /<(h[1-6]|p)([^>]*)>([\s\S]*?)<\/\1>/gi;
  let match;

  while ((match = blockRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const innerHtml = match[3];

    const block: ParsedBlock = {
      type: tag.startsWith("h") ? "heading" : "paragraph",
      level: tag.startsWith("h") ? parseInt(tag[1]) : undefined,
      segments: parseInlineStyles(innerHtml),
    };

    // Ignorar blocos completamente vazios
    if (block.segments.length > 0 && block.segments.some((s) => s.text.length > 0)) {
      blocks.push(block);
    }
  }

  // Se nenhum bloco encontrado, tratar como texto puro
  if (blocks.length === 0) {
    const plainText = stripHtmlToText(html);
    if (plainText.trim()) {
      blocks.push({ type: "paragraph", segments: [{ text: plainText }] });
    }
  }

  return blocks;
}

/**
 * Parseia inline styles (bold, italic, underline) dentro de um bloco.
 */
function parseInlineStyles(html: string): TextSegment[] {
  const segments: TextSegment[] = [];

  // Processar recursivamente tags inline
  function processNode(html: string, inherited: { bold?: boolean; italic?: boolean; underline?: boolean }) {
    // Regex para encontrar tags inline
    const inlineRegex = /<(strong|b|em|i|u|s|mark|span)([^>]*)>([\s\S]*?)<\/\1>/gi;
    let lastIndex = 0;
    let match;

    while ((match = inlineRegex.exec(html)) !== null) {
      // Texto antes da tag
      if (match.index > lastIndex) {
        const textBefore = decodeEntities(html.slice(lastIndex, match.index).replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, ""));
        if (textBefore) {
          segments.push({ text: textBefore, ...inherited });
        }
      }

      const tag = match[1].toLowerCase();
      const innerContent = match[3];

      const styles = { ...inherited };
      if (tag === "strong" || tag === "b") styles.bold = true;
      if (tag === "em" || tag === "i") styles.italic = true;
      if (tag === "u") styles.underline = true;

      // Processar conteúdo interno recursivamente
      processNode(innerContent, styles);

      lastIndex = match.index + match[0].length;
    }

    // Texto restante após a última tag
    if (lastIndex < html.length) {
      const remaining = decodeEntities(html.slice(lastIndex).replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, ""));
      if (remaining) {
        segments.push({ text: remaining, ...inherited });
      }
    }
  }

  processNode(html, {});
  return segments;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Substitui o conteúdo do Google Doc parseando o HTML do TipTap
 * e gerando batch requests que preservam headings e inline styles.
 */
async function replaceDocumentFromHtml(docId: string, html: string) {
  const doc = await getDocumentContent(docId);
  const content = doc.body?.content ?? [];
  const lastElement = content[content.length - 1];
  const endIndex = (lastElement?.endIndex ?? 2) - 1;

  const requests: Array<Record<string, unknown>> = [];

  // 1. Deletar conteúdo existente
  if (endIndex > 1) {
    requests.push({
      deleteContentRange: {
        range: { startIndex: 1, endIndex },
      },
    });
  }

  // 2. Parsear HTML em blocos estruturados
  const blocks = parseTiptapHtml(html);
  if (blocks.length === 0) {
    if (requests.length > 0) await applyEdits(docId, requests);
    return;
  }

  // 3. Construir texto completo e rastrear posições para formatação
  // Inserimos tudo como texto primeiro, depois aplicamos estilos em batch
  const fullText = blocks.map((b) => b.segments.map((s) => s.text).join("")).join("\n");

  if (!fullText.trim()) {
    if (requests.length > 0) await applyEdits(docId, requests);
    return;
  }

  requests.push({
    insertText: {
      location: { index: 1 },
      text: fullText,
    },
  });

  // 4. Calcular ranges e aplicar estilos
  let cursor = 1; // Posição no documento (Google Docs index começa em 1)

  for (const block of blocks) {
    const blockText = block.segments.map((s) => s.text).join("");
    const blockStart = cursor;
    const blockEnd = cursor + blockText.length;

    // Estilo de parágrafo: heading ou normal
    if (block.type === "heading" && block.level) {
      const headingMap: Record<number, string> = {
        1: "HEADING_1",
        2: "HEADING_2",
        3: "HEADING_3",
        4: "HEADING_4",
        5: "HEADING_5",
        6: "HEADING_6",
      };
      requests.push({
        updateParagraphStyle: {
          range: { startIndex: blockStart, endIndex: blockEnd },
          paragraphStyle: {
            namedStyleType: headingMap[block.level] ?? "HEADING_1",
          },
          fields: "namedStyleType",
        },
      });
    } else {
      // Parágrafo normal: formatação MPF
      requests.push({
        updateParagraphStyle: {
          range: { startIndex: blockStart, endIndex: blockEnd },
          paragraphStyle: {
            namedStyleType: "NORMAL_TEXT",
            alignment: "JUSTIFIED",
            lineSpacing: 150,
            spaceBelow: { magnitude: 6, unit: "PT" },
          },
          fields: "namedStyleType,alignment,lineSpacing,spaceBelow",
        },
      });
    }

    // Estilo de texto base (Times New Roman 12pt) para todo o bloco
    requests.push({
      updateTextStyle: {
        range: { startIndex: blockStart, endIndex: blockEnd },
        textStyle: {
          fontSize: { magnitude: 12, unit: "PT" },
          weightedFontFamily: { fontFamily: "Times New Roman" },
        },
        fields: "fontSize,weightedFontFamily",
      },
    });

    // Estilos inline (bold, italic, underline) por segmento
    let segCursor = blockStart;
    for (const seg of block.segments) {
      const segEnd = segCursor + seg.text.length;

      if (seg.bold || seg.italic || seg.underline) {
        const textStyle: Record<string, unknown> = {};
        const fields: string[] = [];

        if (seg.bold) {
          textStyle.bold = true;
          fields.push("bold");
        }
        if (seg.italic) {
          textStyle.italic = true;
          fields.push("italic");
        }
        if (seg.underline) {
          textStyle.underline = true;
          fields.push("underline");
        }

        requests.push({
          updateTextStyle: {
            range: { startIndex: segCursor, endIndex: segEnd },
            textStyle,
            fields: fields.join(","),
          },
        });
      }

      segCursor = segEnd;
    }

    cursor = blockEnd + 1; // +1 para o \n entre blocos
  }

  await applyEdits(docId, requests);
}

/**
 * Remove tags HTML e extrai texto limpo (usado para merge/diff).
 */
function stripHtmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
