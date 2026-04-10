"use client";

import { useState, useEffect, useMemo } from "react";
import { Clock, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getVersionHistory, type DocumentVersion } from "@/lib/offline/document-cache";

interface VersionHistoryProps {
  gdocsId: string;
  onRestore: (tiptapJson: string) => void;
  onClose: () => void;
}

/**
 * Painel lateral (drawer) de histórico de versões locais.
 * Mostra timeline com snapshots das últimas 24h.
 */
export function VersionHistory({ gdocsId, onRestore, onClose }: VersionHistoryProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    getVersionHistory(gdocsId).then(setVersions);
  }, [gdocsId]);

  const selectedVersion = selectedIndex !== null ? versions[selectedIndex] : null;

  if (versions.length === 0) {
    return (
      <div className="w-64 border-l bg-background flex flex-col">
        <VersionHistoryHeader onClose={onClose} />
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs p-4 text-center">
          Nenhuma versão salva ainda. Versões são criadas automaticamente ao sincronizar.
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 border-l bg-background flex flex-col">
      <VersionHistoryHeader onClose={onClose} />

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {versions.map((version, index) => {
            const prevVersion = index > 0 ? versions[index - 1] : null;
            const wordDelta = prevVersion
              ? version.wordCount - prevVersion.wordCount
              : version.wordCount;

            return (
              <button
                key={version.id}
                className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors ${
                  selectedIndex === index
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => setSelectedIndex(selectedIndex === index ? null : index)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {formatTime(version.createdAt)}
                  </span>
                  <span className="text-muted-foreground">
                    {formatTimeAgo(version.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-muted-foreground">
                  <span>{version.wordCount} palavras</span>
                  {wordDelta !== 0 && (
                    <span className={wordDelta > 0 ? "text-green-500" : "text-red-500"}>
                      {wordDelta > 0 ? "+" : ""}{wordDelta}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>

      {/* Ação de restaurar */}
      {selectedVersion && (
        <div className="p-3 border-t shrink-0">
          <Button
            size="sm"
            className="w-full gap-1 text-xs"
            onClick={() => {
              onRestore(selectedVersion.tiptapJson);
              onClose();
            }}
          >
            <RotateCcw className="h-3 w-3" />
            Restaurar esta versão
          </Button>
          <p className="text-[10px] text-muted-foreground text-center mt-1">
            {formatTime(selectedVersion.createdAt)} — {selectedVersion.wordCount} palavras
          </p>
        </div>
      )}
    </div>
  );
}

function VersionHistoryHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
      <div className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold">Histórico</span>
      </div>
      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onClose}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

/** Botão discreto para abrir o histórico de versões */
export function VersionHistoryToggle({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6"
      onClick={onClick}
      title="Histórico de versões"
    >
      <Clock className="h-3 w-3" />
    </Button>
  );
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  return `há ${hours}h`;
}
