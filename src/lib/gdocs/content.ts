import { getDocumentContent, getDocumentAsAnnotatedText } from "./client";

export interface DocumentContent {
  annotatedText: string;
  rawText: string;
  paragraphCount: number;
}

/**
 * Pull sob demanda: busca versão mais recente do Google Doc.
 * Chamado ANTES de qualquer operação de IA.
 */
export async function ensureFreshContent(docId: string): Promise<DocumentContent> {
  const doc = await getDocumentContent(docId);
  const content = doc.body?.content ?? [];

  const paragraphs: string[] = [];
  const annotatedLines: string[] = [];
  let paragraphIndex = 1;

  for (const element of content) {
    if (element.paragraph) {
      const text = element.paragraph.elements
        ?.map((e) => e.textRun?.content ?? "")
        .join("")
        .replace(/\n$/, "");

      if (text) {
        const startIdx = element.startIndex ?? 0;
        const endIdx = element.endIndex ?? 0;
        annotatedLines.push(`[§${paragraphIndex} idx:${startIdx}-${endIdx}] ${text}`);
        paragraphs.push(text);
        paragraphIndex++;
      }
    }
  }

  return {
    annotatedText: annotatedLines.join("\n"),
    rawText: paragraphs.join("\n"),
    paragraphCount: paragraphs.length,
  };
}

/**
 * Traduz instruções de edição da IA em operações Google Docs API batchUpdate.
 * As edições devem ser aplicadas de trás para frente para não invalidar os índices.
 */
export function buildBatchUpdateRequests(
  edits: Array<{
    action: "replace" | "insert_after" | "delete" | "style";
    startIndex: number;
    endIndex: number;
    newText?: string;
    paragraphStyle?: Record<string, unknown>;
    textStyle?: Record<string, unknown>;
    fields?: string;
  }>
): Array<Record<string, unknown>> {
  // Ordenar de trás para frente (índices maiores primeiro)
  const sorted = [...edits].sort((a, b) => b.startIndex - a.startIndex);

  const requests: Array<Record<string, unknown>> = [];

  for (const edit of sorted) {
    switch (edit.action) {
      case "replace": {
        // Deletar conteúdo do parágrafo (sem o \n terminador) e inserir novo texto
        const replaceEnd = edit.endIndex - 1; // excluir \n terminador
        if (replaceEnd > edit.startIndex) {
          requests.push({
            deleteContentRange: {
              range: { startIndex: edit.startIndex, endIndex: replaceEnd },
            },
          });
        }
        if (edit.newText) {
          requests.push({
            insertText: {
              location: { index: edit.startIndex },
              text: edit.newText,
            },
          });
        }
        break;
      }

      case "insert_after":
        if (edit.newText) {
          requests.push({
            insertText: {
              location: { index: edit.endIndex - 1 },
              text: "\n" + edit.newText,
            },
          });
        }
        break;

      case "delete": {
        // Para deletar um parágrafo inteiro: incluir o \n que o precede (se não for o primeiro)
        // para não deixar linha vazia. Não incluir o \n final do segmento (API proíbe).
        const delStart = edit.startIndex > 1 ? edit.startIndex - 1 : edit.startIndex;
        const delEnd = edit.endIndex - 1;
        if (delEnd > delStart) {
          requests.push({
            deleteContentRange: {
              range: { startIndex: delStart, endIndex: delEnd },
            },
          });
        }
        break;
      }

      case "style":
        if (edit.paragraphStyle && edit.fields) {
          requests.push({
            updateParagraphStyle: {
              range: { startIndex: edit.startIndex, endIndex: edit.endIndex },
              paragraphStyle: edit.paragraphStyle,
              fields: edit.fields,
            },
          });
        }
        if (edit.textStyle && edit.fields) {
          // Separar fields de texto dos de parágrafo
          const textFields = edit.fields
            .split(",")
            .filter((f) => ["bold", "italic", "underline", "strikethrough", "fontSize", "weightedFontFamily", "foregroundColor", "backgroundColor"].includes(f.trim()))
            .join(",");
          if (textFields) {
            requests.push({
              updateTextStyle: {
                range: { startIndex: edit.startIndex, endIndex: edit.endIndex },
                textStyle: edit.textStyle,
                fields: textFields,
              },
            });
          }
        }
        break;
    }
  }

  return requests;
}
