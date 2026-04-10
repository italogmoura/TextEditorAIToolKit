import Dexie, { type EntityTable } from "dexie";

/** Documento cacheado para edição offline */
export interface CachedDocument {
  /** ID do Google Docs (chave primária) */
  gdocsId: string;
  /** Conteúdo HTML do documento (para inicializar TipTap e para sync-back) */
  html: string;
  /** JSON do TipTap (persistência fiel do estado do editor) */
  tiptapJson: string | null;
  /** Timestamp de quando o cache foi criado/atualizado */
  cachedAt: number;
  /** Flag indicando que há edições offline pendentes */
  hasPendingEdits: boolean;
}

/** Snapshot de versão local para histórico */
export interface DocumentVersion {
  /** ID auto-incremento */
  id?: number;
  /** ID do Google Docs */
  gdocsId: string;
  /** JSON do TipTap no momento do snapshot */
  tiptapJson: string;
  /** Timestamp do snapshot */
  createdAt: number;
  /** Contagem de palavras no snapshot */
  wordCount: number;
}

class OfflineDatabase extends Dexie {
  documents!: EntityTable<CachedDocument, "gdocsId">;
  versions!: EntityTable<DocumentVersion, "id">;

  constructor() {
    super("TextEditorOffline");
    this.version(1).stores({
      documents: "gdocsId",
      versions: "++id, gdocsId, createdAt",
    });
  }
}

export const db = new OfflineDatabase();

/** Salva ou atualiza o cache de um documento */
export async function cacheDocument(
  gdocsId: string,
  html: string,
  tiptapJson?: string | null
) {
  const existing = await db.documents.get(gdocsId);
  await db.documents.put({
    gdocsId,
    html,
    tiptapJson: tiptapJson ?? existing?.tiptapJson ?? null,
    cachedAt: Date.now(),
    hasPendingEdits: existing?.hasPendingEdits ?? false,
  });
}

/** Atualiza o conteúdo do editor local (TipTap JSON + HTML) e marca como pendente */
export async function saveLocalEdits(
  gdocsId: string,
  tiptapJson: string,
  html: string
) {
  const existing = await db.documents.get(gdocsId);
  if (!existing) return;
  await db.documents.update(gdocsId, {
    tiptapJson,
    html,
    hasPendingEdits: true,
  });
}

/** Marca o documento como sincronizado (sem edições pendentes) */
export async function markSynced(gdocsId: string) {
  await db.documents.update(gdocsId, {
    hasPendingEdits: false,
    cachedAt: Date.now(),
  });
}

/** Salva um snapshot de versão */
export async function saveVersionSnapshot(
  gdocsId: string,
  tiptapJson: string,
  wordCount: number
) {
  await db.versions.add({
    gdocsId,
    tiptapJson,
    createdAt: Date.now(),
    wordCount,
  });

  // Limpar snapshots com mais de 24h
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  await db.versions.where("createdAt").below(cutoff).delete();
}

/** Retorna todos os snapshots de um documento (últimas 24h) */
export async function getVersionHistory(gdocsId: string) {
  return db.versions.where("gdocsId").equals(gdocsId).sortBy("createdAt");
}

/** Retorna o documento cacheado */
export async function getCachedDocument(gdocsId: string) {
  return db.documents.get(gdocsId);
}
