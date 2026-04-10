"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Monitor, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GDocsPreview } from "./gdocs-preview";
import { LocalEditor } from "./local-editor";
import { VersionHistory, VersionHistoryToggle } from "./version-history";
import { ConflictDiffViewer } from "./conflict-diff-viewer";
import { cacheDocument, getCachedDocument, saveLocalEdits } from "@/lib/offline/document-cache";
import { useAutoSync, type SyncStatus } from "@/lib/offline/auto-sync";

type EditorMode = "gdocs" | "local";

interface DocumentEditorProps {
  gdocsId: string;
  isOnline: boolean;
  headingAnchor?: string | null;
}

export function DocumentEditor({ gdocsId, isOnline, headingAnchor }: DocumentEditorProps) {
  const [mode, setMode] = useState<EditorMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("editor-mode-preference") as EditorMode) ?? "gdocs";
    }
    return "gdocs";
  });
  const [cachedHtml, setCachedHtml] = useState<string | null>(null);
  const [cachedTiptapJson, setCachedTiptapJson] = useState<string | null>(null);
  const [isLoadingCache, setIsLoadingCache] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [conflict, setConflict] = useState<{ googleHtml: string; localHtml: string } | null>(null);
  const cacheIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastHtmlRef = useRef<string>("");
  const lastJsonRef = useRef<string>("");

  // Auto-sync engine
  const { syncStatus, triggerSync } = useAutoSync(gdocsId, isOnline, mode === "local");

  // Auto-switch para local quando offline e no modo gdocs
  useEffect(() => {
    if (!isOnline && mode === "gdocs") {
      setMode("local");
    }
  }, [isOnline, mode]);

  // Cache do Google Docs HTML a cada 15s enquanto no modo iframe
  useEffect(() => {
    if (mode !== "gdocs" || !isOnline) {
      if (cacheIntervalRef.current) {
        clearInterval(cacheIntervalRef.current);
        cacheIntervalRef.current = null;
      }
      return;
    }

    const fetchAndCache = async () => {
      try {
        const res = await fetch(`/api/gdocs/html?docId=${encodeURIComponent(gdocsId)}`);
        if (res.ok) {
          const data = await res.json();
          await cacheDocument(gdocsId, data.html);
        }
      } catch {
        // Falha silenciosa — pode ser que a internet acabou de cair
      }
    };

    // Cache imediato + intervalo de 15s
    fetchAndCache();
    cacheIntervalRef.current = setInterval(fetchAndCache, 15_000);

    return () => {
      if (cacheIntervalRef.current) {
        clearInterval(cacheIntervalRef.current);
        cacheIntervalRef.current = null;
      }
    };
  }, [mode, gdocsId, isOnline]);

  // Carregar cache ao entrar no modo local
  useEffect(() => {
    if (mode !== "local") return;

    setIsLoadingCache(true);
    getCachedDocument(gdocsId).then(async (cached) => {
      if (cached) {
        setCachedHtml(cached.html);
        setCachedTiptapJson(cached.tiptapJson);
        lastHtmlRef.current = cached.html;
        lastJsonRef.current = cached.tiptapJson ?? "";
      } else if (isOnline) {
        // Sem cache — buscar do Google Docs
        try {
          const res = await fetch(`/api/gdocs/html?docId=${encodeURIComponent(gdocsId)}`);
          if (res.ok) {
            const data = await res.json();
            await cacheDocument(gdocsId, data.html);
            setCachedHtml(data.html);
            lastHtmlRef.current = data.html;
          }
        } catch {
          // Sem cache e sem internet — nada a fazer
        }
      }
      setIsLoadingCache(false);
    });
  }, [mode, gdocsId, isOnline]);

  const handleContentChange = useCallback((html: string, json: string) => {
    lastHtmlRef.current = html;
    lastJsonRef.current = json;
  }, []);

  const handleToggleMode = useCallback(async () => {
    if (mode === "local") {
      // local → gdocs: sync final antes de trocar
      if (isOnline && lastJsonRef.current) {
        await triggerSync();
      }
      setMode("gdocs");
      localStorage.setItem("editor-mode-preference", "gdocs");
    } else {
      // gdocs → local: carregar cache
      setMode("local");
      localStorage.setItem("editor-mode-preference", "local");
    }
  }, [mode, isOnline, triggerSync]);

  return (
    <div className="flex-1 relative overflow-hidden min-h-0 min-w-0 flex flex-col">
      {/* Toggle bar */}
      <div className="flex items-center justify-between px-2 py-1 border-b bg-muted/20 shrink-0">
        <div className="flex items-center gap-1">
          <Button
            variant={mode === "gdocs" ? "default" : "ghost"}
            size="sm"
            className="h-6 text-[10px] gap-1"
            onClick={() => mode !== "gdocs" && handleToggleMode()}
            disabled={!isOnline && mode === "local"}
            title={!isOnline ? "Google Docs indisponível offline" : "Usar Google Docs"}
          >
            <Globe className="h-3 w-3" />
            Google Docs
          </Button>
          <Button
            variant={mode === "local" ? "default" : "ghost"}
            size="sm"
            className="h-6 text-[10px] gap-1"
            onClick={() => mode !== "local" && handleToggleMode()}
            title="Usar editor local (funciona offline)"
          >
            <Monitor className="h-3 w-3" />
            Editor Local
          </Button>
        </div>

        {/* Status + botão de histórico (discreto) */}
        <div className="flex items-center gap-1">
          {mode === "local" && (
            <>
              <SyncStatusBadge status={syncStatus} isOnline={isOnline} />
              <VersionHistoryToggle onClick={() => setShowVersionHistory((v) => !v)} />
            </>
          )}
        </div>
      </div>

      {/* Editor content + version history sidebar */}
      <div className="flex-1 flex overflow-hidden min-h-0 min-w-0">
        {/* Main editor area */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 min-w-0">
          {mode === "gdocs" ? (
            <div className="flex-1 relative overflow-hidden min-h-0 min-w-0">
              <GDocsPreview gdocsId={gdocsId} headingAnchor={headingAnchor} />
            </div>
          ) : isLoadingCache ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Carregando documento...
            </div>
          ) : cachedHtml ? (
            <LocalEditor
              gdocsId={gdocsId}
              initialHtml={cachedHtml}
              initialTiptapJson={cachedTiptapJson}
              isOnline={isOnline}
              syncStatus={syncStatus}
              onContentChange={handleContentChange}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              <div className="text-center">
                <p>Nenhum cache disponível para edição offline.</p>
                <p className="text-xs mt-1">Abra o documento no Google Docs primeiro para criar o cache.</p>
              </div>
            </div>
          )}
        </div>

        {/* Version history drawer (lateral, não cobre o editor) */}
        {showVersionHistory && mode === "local" && (
          <VersionHistory
            gdocsId={gdocsId}
            onRestore={async (tiptapJson) => {
              // Restaurar versão: salvar no cache e recarregar
              const html = ""; // Será regenerado pelo TipTap
              await saveLocalEdits(gdocsId, tiptapJson, html);
              setCachedTiptapJson(tiptapJson);
              setCachedHtml(null);
              // Força recarga do editor
              setIsLoadingCache(true);
              setTimeout(() => {
                setCachedHtml("<p></p>"); // placeholder
                setCachedTiptapJson(tiptapJson);
                setIsLoadingCache(false);
              }, 100);
            }}
            onClose={() => setShowVersionHistory(false)}
          />
        )}
      </div>

      {/* Conflict diff viewer (modal overlay) */}
      {conflict && (
        <ConflictDiffViewer
          googleHtml={conflict.googleHtml}
          localHtml={conflict.localHtml}
          onResolve={async (resolution) => {
            if (resolution === "use-local") {
              // Forçar sync com overwrite
              await fetch("/api/gdocs/sync-back", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ gdocsId, htmlContent: conflict.localHtml, cachedAt: 0 }),
              });
            } else if (resolution === "download-both") {
              // Criar blobs e baixar
              downloadText(conflict.googleHtml, `${gdocsId}-google.html`);
              downloadText(conflict.localHtml, `${gdocsId}-local.html`);
            }
            // "use-google" = não faz nada (mantém Google como está)
            setConflict(null);
          }}
        />
      )}
    </div>
  );
}

function SyncStatusBadge({ status, isOnline }: { status: SyncStatus; isOnline: boolean }) {
  if (!isOnline) {
    return (
      <span className="text-[10px] text-amber-500 flex items-center gap-1">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
        Offline
      </span>
    );
  }

  switch (status) {
    case "synced":
      return (
        <span className="text-[10px] text-green-500 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
          Sincronizado
        </span>
      );
    case "syncing":
      return (
        <span className="text-[10px] text-blue-500 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          Sincronizando...
        </span>
      );
    case "pending":
      return (
        <span className="text-[10px] text-amber-500 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
          Pendente
        </span>
      );
    case "conflict":
      return (
        <span className="text-[10px] text-red-500 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
          Conflito
        </span>
      );
    case "error":
      return (
        <span className="text-[10px] text-red-500 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
          Erro
        </span>
      );
    default:
      return null;
  }
}

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
