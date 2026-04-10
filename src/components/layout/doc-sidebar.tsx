"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText, FolderOpen, BookOpen, ChevronDown, ChevronRight, GripVertical,
} from "lucide-react";
import type { ProcessDocument } from "@/lib/types/process";

interface DocSidebarProps {
  documents: ProcessDocument[];
  onSelectDocument: (doc: ProcessDocument) => void;
  onDragStart?: (doc: ProcessDocument, e: React.DragEvent) => void;
}

export function DocSidebar({ documents, onSelectDocument, onDragStart }: DocSidebarProps) {
  const [tocOpen, setTocOpen] = useState(true);
  const [filesOpen, setFilesOpen] = useState(true);

  const pdfs = documents.filter((d) => d.type === "pdf");
  const pecas = documents.filter((d) => d.type === "peca");
  const indices = documents.filter((d) => d.type === "index");
  const notes = documents.filter((d) => d.type === "notes");
  const allFiles = [...indices, ...pdfs, ...pecas, ...notes];

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  function getIcon(doc: ProcessDocument) {
    switch (doc.type) {
      case "pdf": return <FolderOpen className="h-3 w-3 text-red-400 shrink-0" />;
      case "peca": return <FileText className="h-3 w-3 text-blue-400 shrink-0" />;
      case "index": return <BookOpen className="h-3 w-3 text-green-500 shrink-0" />;
      case "notes": return <FileText className="h-3 w-3 text-amber-400 shrink-0" />;
      default: return <FileText className="h-3 w-3 text-zinc-400 shrink-0" />;
    }
  }

  return (
    <div
      className="h-full flex flex-col border-r shrink-0 overflow-hidden"
      style={{ width: "200px", background: "rgba(250,250,250,0.8)" }}
    >
      <ScrollArea className="flex-1">
        <div className="py-2">
          {/* Índice do documento (Table of Contents placeholder) */}
          <button
            className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase text-zinc-400 hover:text-zinc-600"
            onClick={() => setTocOpen(!tocOpen)}
          >
            {tocOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Índice do Documento
          </button>
          {tocOpen && (
            <div className="px-3 py-1 text-[11px] text-zinc-400 italic">
              Navegue pelo sumário no Google Docs
            </div>
          )}

          {/* Arquivos do processo */}
          <button
            className="w-full flex items-center gap-1.5 px-3 py-1.5 mt-2 text-[10px] font-semibold uppercase text-zinc-400 hover:text-zinc-600"
            onClick={() => setFilesOpen(!filesOpen)}
          >
            {filesOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Arquivos do Processo
          </button>
          {filesOpen && (
            <div className="space-y-0.5 px-1">
              {allFiles.map((doc) => (
                <div
                  key={doc.name}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", `[${doc.name}]`);
                    e.dataTransfer.setData("application/x-doc-path", doc.path);
                    e.dataTransfer.setData("application/x-doc-name", doc.name);
                    onDragStart?.(doc, e);
                  }}
                  onClick={() => onSelectDocument(doc)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer hover:bg-zinc-100 group"
                  title={`${doc.name}\n${formatBytes(doc.sizeBytes)}\nArraste para o input da IA`}
                >
                  <GripVertical className="h-2.5 w-2.5 text-zinc-300 opacity-0 group-hover:opacity-100 shrink-0 cursor-grab" />
                  {getIcon(doc)}
                  <span className="text-[11px] text-zinc-600 truncate">{doc.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
