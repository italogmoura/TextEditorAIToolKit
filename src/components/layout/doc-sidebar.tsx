"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText, FolderOpen, BookOpen, ChevronDown, ChevronRight, GripVertical, PanelLeft, PanelRight,
} from "lucide-react";
import type { ProcessDocument } from "@/lib/types/process";

interface SidebarProps {
  documents: ProcessDocument[];
  onSelectDocument: (doc: ProcessDocument) => void;
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

/**
 * Sidebar esquerda — Árvore de arquivos do processo (arrastáveis para IA)
 */
export function FilesSidebar({ documents, onSelectDocument }: SidebarProps) {
  const [open, setOpen] = useState(false);

  const pdfs = documents.filter((d) => d.type === "pdf");
  const pecas = documents.filter((d) => d.type === "peca");
  const indices = documents.filter((d) => d.type === "index");
  const notes = documents.filter((d) => d.type === "notes");

  return (
    <div
      className="h-full flex flex-col border-r shrink-0 overflow-hidden"
      style={{ width: open ? "200px" : "auto", background: "rgba(250,250,250,0.8)" }}
    >
      <button
        className={`flex items-center gap-1.5 px-2 py-2 text-[10px] font-semibold uppercase border-b shrink-0 transition-colors ${
          open ? "text-zinc-700 bg-zinc-100" : "text-zinc-400 hover:text-zinc-600"
        }`}
        onClick={() => setOpen(!open)}
        title="Arquivos do processo"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <PanelLeft className="h-3 w-3" />}
        {open && "Arquivos"}
      </button>

      {open && (
        <ScrollArea className="flex-1 min-h-0">
          <div className="py-1 px-1 space-y-0.5">
            {[
              { label: "Índices", items: indices },
              { label: "PDFs", items: pdfs },
              { label: "Peças", items: pecas },
              { label: "Notas", items: notes },
            ].filter((g) => g.items.length > 0).map((group) => (
              <div key={group.label}>
                <div className="px-2 pt-1.5 pb-0.5 text-[9px] font-semibold uppercase text-zinc-300">
                  {group.label}
                </div>
                {group.items.map((doc) => (
                  <div
                    key={doc.name}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", `[${doc.name}]`);
                      e.dataTransfer.setData("application/x-doc-path", doc.path);
                      e.dataTransfer.setData("application/x-doc-name", doc.name);
                    }}
                    onClick={() => onSelectDocument(doc)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer hover:bg-zinc-100 group"
                    title="Arraste para o input da IA"
                  >
                    <GripVertical className="h-2.5 w-2.5 text-zinc-300 opacity-0 group-hover:opacity-100 shrink-0 cursor-grab" />
                    {getIcon(doc)}
                    <span className="text-[11px] text-zinc-600 truncate">{doc.name}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

/**
 * Sidebar direita — Índice/sumário do documento
 */
export function IndexSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="h-full flex flex-col border-l shrink-0 overflow-hidden"
      style={{ width: open ? "180px" : "auto", background: "rgba(250,250,250,0.8)" }}
    >
      <button
        className={`flex items-center gap-1.5 px-2 py-2 text-[10px] font-semibold uppercase border-b shrink-0 transition-colors ${
          open ? "text-zinc-700 bg-zinc-100" : "text-zinc-400 hover:text-zinc-600"
        }`}
        onClick={() => setOpen(!open)}
        title="Índice do documento"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <PanelRight className="h-3 w-3" />}
        {open && "Índice"}
      </button>

      {open && (
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-3 py-2 text-[11px] text-zinc-400 italic">
            Navegue pelo sumário no Google Docs
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
