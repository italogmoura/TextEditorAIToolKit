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
    <div className="relative h-full min-h-0 min-w-0">
      {onClose && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-2 right-2 z-10 h-6 w-6 opacity-60 hover:opacity-100 shadow-sm"
          onClick={onClose}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
      <iframe
        src={src}
        className="w-full h-full border-0"
        title="PDF Viewer"
      />
    </div>
  );
}
