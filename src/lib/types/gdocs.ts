export interface GDocsMetaEntry {
  gdocsId: string;
  gdocsRevisionId: string;
  lastSyncedAt: string;
  status: "active" | "filed" | "archived";
}

export type GDocsMeta = Record<string, GDocsMetaEntry>;

export interface GDocsDocumentInfo {
  docId: string;
  title: string;
  url: string;
  isLocked: boolean;
  lastModified?: string;
}
