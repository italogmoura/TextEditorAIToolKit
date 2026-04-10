export interface ProcessInfo {
  number: string;
  path: string;
  hasPecas: boolean;
  hasIndex: boolean;
  pecasCount: number;
  pdfsCount: number;
  status: ProcessStatus;
}

export type ProcessStatus =
  | "novo"        // sem índice, sem peças
  | "indexado"    // índice pronto, sem peças
  | "elaborando"  // peça em rascunho
  | "revisado"    // revisão completa aprovada
  | "protocolado"; // .docx exportado

export interface ProcessDocument {
  name: string;
  path: string;
  type: "peca" | "pdf" | "index" | "notes" | "other";
  sizeBytes: number;
  modifiedAt: string;
  gdocsId?: string;
}
