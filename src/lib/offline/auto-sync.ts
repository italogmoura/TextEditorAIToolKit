"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { db, markSynced, saveVersionSnapshot } from "./document-cache";

export type SyncStatus = "synced" | "syncing" | "pending" | "conflict" | "error";

const SYNC_INTERVAL = 15_000; // 15 segundos

/**
 * Hook que gerencia o sync automático do editor local → Google Docs.
 * Roda a cada 15s quando online e no modo local. Ao reconectar, sincroniza imediatamente.
 */
export function useAutoSync(gdocsId: string, isOnline: boolean, isLocalMode: boolean) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSyncedJsonRef = useRef<string>("");
  const isSyncingRef = useRef(false);

  const doSync = useCallback(async (): Promise<boolean> => {
    if (isSyncingRef.current || !gdocsId) return false;

    const doc = await db.documents.get(gdocsId);
    if (!doc || !doc.hasPendingEdits) return false;

    // Nada mudou desde o último sync
    if (doc.tiptapJson && doc.tiptapJson === lastSyncedJsonRef.current) return false;

    isSyncingRef.current = true;
    setSyncStatus("syncing");

    try {
      const res = await fetch("/api/gdocs/sync-back", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gdocsId,
          htmlContent: doc.html,
          cachedAt: doc.cachedAt,
        }),
      });

      if (res.ok) {
        lastSyncedJsonRef.current = doc.tiptapJson ?? "";
        await markSynced(gdocsId);

        // Salvar snapshot de versão
        if (doc.tiptapJson) {
          const wordCount = doc.html.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
          await saveVersionSnapshot(gdocsId, doc.tiptapJson, wordCount);
        }

        setSyncStatus("synced");
        return true;
      } else if (res.status === 409) {
        // Conflito detectado
        setSyncStatus("conflict");
        return false;
      } else {
        setSyncStatus("error");
        return false;
      }
    } catch {
      setSyncStatus("error");
      return false;
    } finally {
      isSyncingRef.current = false;
    }
  }, [gdocsId]);

  // Sync automático a cada 15s quando online e no modo local
  useEffect(() => {
    if (!isOnline || !isLocalMode) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (!isOnline && isLocalMode) {
        setSyncStatus("pending");
      }
      return;
    }

    // Sync imediato ao ficar online (reconexão)
    doSync();

    intervalRef.current = setInterval(doSync, SYNC_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isOnline, isLocalMode, doSync]);

  // Trigger manual (para sync final antes de trocar de modo)
  const triggerSync = useCallback(async () => {
    if (isOnline) {
      return doSync();
    }
    return false;
  }, [isOnline, doSync]);

  return { syncStatus, triggerSync };
}
