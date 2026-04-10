"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function PdfViewer({
  filePath,
  onClose,
  highlightPage,
}: {
  filePath: string;
  onClose?: () => void;
  highlightPage?: number;
}) {
  const pdfUrl = `/api/pdf?path=${encodeURIComponent(filePath)}`;
  // O viewer nativo do browser suporta navegação direta para página via #page=N
  const src = highlightPage ? `${pdfUrl}#page=${highlightPage}` : pdfUrl;

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 bg-zinc-100">
      {/* Toolbar mínima — o viewer nativo já tem seus próprios controles */}
      {onClose && (
        <div className="flex items-center justify-end px-3 py-1.5 bg-white border-b">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Viewer nativo do browser — streaming real, suporta PDFs de qualquer tamanho */}
      <iframe
        src={src}
        className="flex-1 w-full border-0"
        title="PDF Viewer"
      />
    </div>
  );
}
