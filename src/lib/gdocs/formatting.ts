/**
 * Formatação padrão MPF para Google Docs.
 * Times New Roman 12pt, espaçamento 1.5, justificado, margens 2cm.
 */

export function getMpfFormattingRequests(docId: string): Array<Record<string, unknown>> {
  return [
    // Configurar fonte padrão para o documento inteiro
    {
      updateTextStyle: {
        range: { startIndex: 1, endIndex: 999999 },
        textStyle: {
          fontSize: { magnitude: 12, unit: "PT" },
          weightedFontFamily: { fontFamily: "Times New Roman" },
        },
        fields: "fontSize,weightedFontFamily",
      },
    },
    // Configurar espaçamento e alinhamento
    {
      updateParagraphStyle: {
        range: { startIndex: 1, endIndex: 999999 },
        paragraphStyle: {
          alignment: "JUSTIFIED",
          lineSpacing: 150, // 1.5 spacing
          spaceAbove: { magnitude: 0, unit: "PT" },
          spaceBelow: { magnitude: 6, unit: "PT" },
        },
        fields: "alignment,lineSpacing,spaceAbove,spaceBelow",
      },
    },
  ];
}

/**
 * Aplica formatação de título (heading).
 */
export function getHeadingFormattingRequest(
  startIndex: number,
  endIndex: number,
  level: 1 | 2 | 3
): Record<string, unknown> {
  const fontSize = level === 1 ? 14 : level === 2 ? 13 : 12;
  return {
    updateTextStyle: {
      range: { startIndex, endIndex },
      textStyle: {
        bold: true,
        fontSize: { magnitude: fontSize, unit: "PT" },
        weightedFontFamily: { fontFamily: "Times New Roman" },
      },
      fields: "bold,fontSize,weightedFontFamily",
    },
  };
}

/**
 * Aplica formatação de assinatura (centralizado).
 */
export function getSignatureFormattingRequest(
  startIndex: number,
  endIndex: number
): Record<string, unknown> {
  return {
    updateParagraphStyle: {
      range: { startIndex, endIndex },
      paragraphStyle: {
        alignment: "CENTER",
      },
      fields: "alignment",
    },
  };
}
