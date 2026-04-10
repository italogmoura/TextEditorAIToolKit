"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues (DOMMatrix not defined on server)
const Document = dynamic(
  () => import("react-pdf").then((mod) => {
    // Configure worker on client side
    mod.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${mod.pdfjs.version}/build/pdf.worker.min.mjs`;
    return mod.Document;
  }),
  { ssr: false }
);

const Page = dynamic(
  () => import("react-pdf").then((mod) => mod.Page),
  { ssr: false }
);

export function PdfViewer({
  filePath,
  onClose,
  highlightPage,
}: {
  filePath: string;
  onClose?: () => void;
  highlightPage?: number;
}) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(highlightPage ?? 1);
  const [scale, setScale] = useState(1.0);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Observe container width to fit PDF page to available space
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Subtract padding (2 * 16px = 32px)
        setContainerWidth(entry.contentRect.width - 32);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const pdfUrl = `/api/pdf?path=${encodeURIComponent(filePath)}`;

  return (
    <div className="flex flex-col h-full bg-zinc-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-mono min-w-[80px] text-center">
            {currentPage} / {numPages}
          </span>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
            disabled={currentPage >= numPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale(Math.max(0.5, scale - 0.1))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs min-w-[40px] text-center">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale(Math.min(2.0, scale + 0.1))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-7 w-7 ml-2" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* PDF content */}
      <div className="flex-1 overflow-auto flex justify-center p-4" ref={contentRef}>
        <Document
          file={pdfUrl}
          onLoadSuccess={({ numPages: n }: { numPages: number }) => {
            setNumPages(n);
            if (highlightPage && highlightPage <= n) setCurrentPage(highlightPage);
          }}
          loading={
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              Carregando PDF...
            </div>
          }
          error={
            <div className="flex items-center justify-center h-64 text-destructive text-sm">
              Erro ao carregar PDF
            </div>
          }
        >
          <Page
            pageNumber={currentPage}
            width={containerWidth ? containerWidth * scale : undefined}
            scale={containerWidth ? undefined : scale}
          />
        </Document>
      </div>
    </div>
  );
}
