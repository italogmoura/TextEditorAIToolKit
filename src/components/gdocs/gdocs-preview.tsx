"use client";

import { useState } from "react";
import { ExternalLink, RefreshCw, FileText, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GDocsPreview({
  gdocsId,
  title,
  processNumber,
  filePath,
  onRemigrate,
}: {
  gdocsId: string;
  title?: string;
  processNumber?: string;
  filePath?: string;
  onRemigrate?: () => void;
}) {
  const [iframeError, setIframeError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // /edit = editable (user must be logged in and have edit permission)
  // /preview = read-only fallback
  const editUrl = `https://docs.google.com/document/d/${gdocsId}/edit`;
  const embedUrl = `https://docs.google.com/document/d/${gdocsId}/edit?rm=minimal`;

  return (
    <div className={`flex flex-col min-h-0 ${expanded ? "fixed inset-0 z-50 bg-background" : "h-full"}`}>
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium truncate">{title ?? "Google Docs"}</span>
        </div>
        <div className="flex items-center gap-1">
          {onRemigrate && filePath && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs gap-1"
              onClick={onRemigrate}
              title="Re-migrar .docx (sobrescreve o Google Doc atual)"
            >
              <RefreshCw className="h-3 w-3" />
              Re-migrar
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? "Minimizar" : "Expandir"}
          >
            {expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </Button>
          <Button
            variant="default"
            size="sm"
            className="h-6 text-xs gap-1"
            onClick={() => window.open(editUrl, "_blank")}
          >
            <ExternalLink className="h-3 w-3" />
            Editar
          </Button>
        </div>
      </div>

      {iframeError ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center space-y-3">
            <FileText className="h-12 w-12 mx-auto opacity-30" />
            <p className="text-sm">Não foi possível carregar o preview</p>
            <Button
              variant="default"
              size="sm"
              onClick={() => window.open(editUrl, "_blank")}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Abrir no Google Docs
            </Button>
          </div>
        </div>
      ) : (
        <iframe
          src={embedUrl}
          className="w-full border-0"
          style={{ flex: "1 1 0%", minHeight: 0 }}
          title="Google Docs Editor"
          onError={() => setIframeError(true)}
          allow="clipboard-read; clipboard-write"
        />
      )}
    </div>
  );
}
