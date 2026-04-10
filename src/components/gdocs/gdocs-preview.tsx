"use client";

import { useState, useEffect, useRef } from "react";
import { ExternalLink, RefreshCw, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GDocsPreview({
  gdocsId,
  expanded,
  headingAnchor,
}: {
  gdocsId: string;
  expanded?: boolean;
  headingAnchor?: string | null;
}) {
  const [iframeError, setIframeError] = useState(false);
  const appliedMargins = useRef<Set<string>>(new Set());
  const anchor = headingAnchor ? `#heading=${headingAnchor}` : "";
  const embedUrl = `https://docs.google.com/document/d/${gdocsId}/edit?rm=minimal${anchor}`;
  const editUrl = `https://docs.google.com/document/d/${gdocsId}/edit`;

  useEffect(() => {
    if (appliedMargins.current.has(gdocsId)) return;
    appliedMargins.current.add(gdocsId);
    fetch("/api/gdocs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gdocsId }),
    }).catch(() => {});
  }, [gdocsId]);

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

  if (expanded) {
    return (
      <iframe
        src={embedUrl}
        className="fixed inset-0 z-50 w-full h-full border-0"
        title="Google Docs Editor"
        onError={() => setIframeError(true)}
        allow="clipboard-read; clipboard-write"
      />
    );
  }

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ w: width, h: height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Largura fixa próxima da página A4/Letter do Google Docs + pequena margem do canvas
  const iframeFixedWidth = 840;
  const scale = containerSize.w > 0 ? Math.min(1, containerSize.w / iframeFixedWidth) : 0.7;

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <iframe
        src={embedUrl}
        className="border-0 origin-top-left"
        style={{
          width: iframeFixedWidth,
          height: containerSize.h > 0 ? containerSize.h / scale : "100%",
          transform: `scale(${scale})`,
        }}
        title="Google Docs Editor"
        onError={() => setIframeError(true)}
        allow="clipboard-read; clipboard-write"
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
