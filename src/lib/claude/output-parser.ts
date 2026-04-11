/**
 * Parser de saída estruturada do Claude Code CLI.
 * Extrai blocos de edição JSON (gdocs-edits) da resposta de texto.
 */

export interface DocumentEdit {
  action: "replace" | "insert_after" | "delete" | "style";
  startIndex: number;
  endIndex: number;
  newText?: string;
  paragraphStyle?: Record<string, unknown>;
  textStyle?: Record<string, unknown>;
  fields?: string;
}

export interface ParsedOutput {
  /** Edições extraídas, ou null se nenhuma encontrada */
  edits: DocumentEdit[] | null;
  /** Resposta limpa (sem o bloco JSON de edições) */
  cleanedResponse: string;
  /** Saída bruta original */
  rawOutput: string;
}

/**
 * Extrai o bloco ```gdocs-edits ... ``` da saída do Claude e parseia como JSON.
 * Retorna as edições e a resposta limpa (sem o bloco de edições).
 */
export function parseClaudeOutput(output: string): ParsedOutput {
  const raw = output;

  // Regex para capturar bloco fenced com tag gdocs-edits
  const fenceRegex = /```gdocs-edits\s*\n([\s\S]*?)```/;
  const match = output.match(fenceRegex);

  if (!match) {
    return { edits: null, cleanedResponse: output.trim(), rawOutput: raw };
  }

  const jsonStr = match[1].trim();
  const cleanedResponse = output.replace(fenceRegex, "").trim();

  try {
    const parsed = JSON.parse(jsonStr);

    if (!Array.isArray(parsed)) {
      console.warn("[output-parser] gdocs-edits não é um array:", parsed);
      return { edits: null, cleanedResponse, rawOutput: raw };
    }

    // Validar cada edição
    const edits: DocumentEdit[] = [];
    for (const item of parsed) {
      if (
        typeof item.action === "string" &&
        ["replace", "insert_after", "delete", "style"].includes(item.action) &&
        typeof item.startIndex === "number" &&
        typeof item.endIndex === "number"
      ) {
        edits.push({
          action: item.action,
          startIndex: item.startIndex,
          endIndex: item.endIndex,
          newText: item.newText ?? undefined,
          paragraphStyle: item.paragraphStyle ?? undefined,
          textStyle: item.textStyle ?? undefined,
          fields: item.fields ?? undefined,
        });
      } else {
        console.warn("[output-parser] Edição inválida ignorada:", item);
      }
    }

    if (edits.length === 0) {
      return { edits: null, cleanedResponse, rawOutput: raw };
    }

    return { edits, cleanedResponse, rawOutput: raw };
  } catch (error) {
    console.error("[output-parser] Erro ao parsear gdocs-edits JSON:", error);
    return { edits: null, cleanedResponse, rawOutput: raw };
  }
}
