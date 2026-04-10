"use client";

import { useState } from "react";
import { ExternalLink, RefreshCw, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GDocsPreview({
  gdocsId,
  expanded,
}: {
  gdocsId: string;
  expanded?: boolean;
}) {
  const [iframeError, setIframeError] = useState(false);
  const embedUrl = `https://docs.google.com/document/d/${gdocsId}/edit?rm=minimal`;
  const editUrl = `https://docs.google.com/document/d/${gdocsId}/edit`;

  if (iframeError) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-3">
          <p className="text-sm">Não foi possível carregar o preview</p>
          <Button size="sm" onClick={() => window.open(editUrl, "_blank")}>
            <ExternalLink className="h-4 w-4 mr-1" />
            Abrir no Google Docs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" style={{ flex: "1 1 0%", minHeight: 0 }}>
      <iframe
        src={embedUrl}
        className={`w-full h-full border-0 ${expanded ? "fixed inset-0 z-50" : ""}`}
        title="Google Docs Editor"
        onError={() => setIframeError(true)}
        allow="clipboard-read; clipboard-write"
      />
      {/* Cover the Google Docs floating action buttons (comment/emoji/suggest) */}
      <div
        className="absolute top-0 right-0 w-12 pointer-events-none"
        style={{ height: "100%", background: "linear-gradient(to left, rgba(255,255,255,0.97) 70%, transparent)" }}
      />
    </div>
  );
}

/**
 * Botões de ação do GDocs para renderizar no header.
 */
export function GDocsActions({
  gdocsId,
  filePath,
  onRemigrate,
}: {
  gdocsId: string;
  filePath?: string;
  onRemigrate?: () => void;
}) {
  const editUrl = `https://docs.google.com/document/d/${gdocsId}/edit`;

  return (
    <div className="flex items-center gap-1 shrink-0">
      {onRemigrate && filePath && (
        <Button variant="ghost" size="sm" className="h-5 text-[10px] gap-1" onClick={onRemigrate} title="Re-migrar .docx">
          <RefreshCw className="h-2.5 w-2.5" />
          Re-migrar
        </Button>
      )}
      <Button
        variant="ghost" size="sm" className="h-5 text-[10px] gap-1"
        onClick={() => window.open(editUrl, "_blank")}
      >
        <ExternalLink className="h-2.5 w-2.5" />
        Editar
      </Button>
    </div>
  );
}
