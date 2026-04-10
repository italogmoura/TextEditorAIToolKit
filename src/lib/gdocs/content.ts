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
    action: "replace" | "insert_after" | "delete";
    startIndex: number;
    endIndex: number;
    newText?: string;
  }>
): Array<Record<string, unknown>> {
  // Ordenar de trás para frente (índices maiores primeiro)
  const sorted = [...edits].sort((a, b) => b.startIndex - a.startIndex);

  const requests: Array<Record<string, unknown>> = [];

  for (const edit of sorted) {
    switch (edit.action) {
      case "replace":
        // Primeiro deletar, depois inserir
        requests.push({
          deleteContentRange: {
            range: { startIndex: edit.startIndex, endIndex: edit.endIndex },
          },
        });
        if (edit.newText) {
          requests.push({
            insertText: {
              location: { index: edit.startIndex },
              text: edit.newText,
            },
          });
        }
        break;

      case "insert_after":
        if (edit.newText) {
          requests.push({
            insertText: {
              location: { index: edit.endIndex },
              text: "\n" + edit.newText,
            },
          });
        }
        break;

      case "delete":
        requests.push({
          deleteContentRange: {
            range: { startIndex: edit.startIndex, endIndex: edit.endIndex },
          },
        });
        break;
    }
  }

  return requests;
}
