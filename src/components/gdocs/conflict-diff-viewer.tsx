"use client";

import { useMemo } from "react";
import { AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import DiffMatchPatch from "diff-match-patch";

const dmp = new DiffMatchPatch();

interface ConflictDiffViewerProps {
  googleHtml: string;
  localHtml: string;
  onResolve: (resolution: "use-local" | "use-google" | "download-both") => void;
}

/**
 * Visualizador de conflito lado a lado com diff colorido.
 * Mostra a versão do Google Docs vs edições offline com highlights.
 */
export function ConflictDiffViewer({
  googleHtml,
  localHtml,
  onResolve,
}: ConflictDiffViewerProps) {
  const googleText = stripHtml(googleHtml);
  const localText = stripHtml(localHtml);

  const diffs = useMemo(() => {
    const d = dmp.diff_main(googleText, localText);
    dmp.diff_cleanupSemantic(d);
    return d;
  }, [googleText, localText]);

  // Gerar HTML com highlights para cada painel
  const { googleHighlighted, localHighlighted } = useMemo(() => {
    const google: string[] = [];
    const local: string[] = [];

    for (const [op, text] of diffs) {
      const escaped = escapeHtml(text);
      const lines = escaped.replace(/\n/g, "<br/>");

      if (op === 0) {
        // Sem mudança
        google.push(`<span>${lines}</span>`);
        local.push(`<span>${lines}</span>`);
      } else if (op === -1) {
        // Removido do Google (existe no Google, não no local)
        google.push(`<span class="bg-red-100 text-red-800 line-through">${lines}</span>`);
      } else if (op === 1) {
        // Adicionado no local (não existe no Google)
        local.push(`<span class="bg-green-100 text-green-800">${lines}</span>`);
      }
    }

    return {
      googleHighlighted: google.join(""),
      localHighlighted: local.join(""),
    };
  }, [diffs]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <div>
            <h2 className="text-sm font-semibold">Conflito detectado</h2>
            <p className="text-xs text-muted-foreground">
              O Google Docs tem alterações que divergem da sua versão offline. Escolha como resolver.
            </p>
          </div>
        </div>

        {/* Diff panels */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Google Docs version */}
          <div className="flex-1 flex flex-col border-r">
            <div className="px-3 py-2 bg-muted/30 border-b shrink-0">
              <span className="text-xs font-semibold text-muted-foreground">Versão Google Docs</span>
            </div>
            <div
              className="flex-1 overflow-auto p-4 text-sm font-serif leading-relaxed"
              dangerouslySetInnerHTML={{ __html: googleHighlighted }}
            />
          </div>

          {/* Local version */}
          <div className="flex-1 flex flex-col">
            <div className="px-3 py-2 bg-muted/30 border-b shrink-0">
              <span className="text-xs font-semibold text-muted-foreground">Edições Offline</span>
            </div>
            <div
              className="flex-1 overflow-auto p-4 text-sm font-serif leading-relaxed"
              dangerouslySetInnerHTML={{ __html: localHighlighted }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => onResolve("download-both")}
          >
            <Download className="h-3.5 w-3.5" />
            Baixar ambas
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onResolve("use-google")}
          >
            Usar versão Google Docs
          </Button>
          <Button
            size="sm"
            onClick={() => onResolve("use-local")}
          >
            Usar minhas edições offline
          </Button>
        </div>
      </div>
    </div>
  );
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
