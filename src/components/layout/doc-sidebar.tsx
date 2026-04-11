"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText, FolderOpen, BookOpen, ChevronDown, ChevronRight, GripVertical, PanelLeft, PanelRight, RefreshCw, ChevronsLeft, ChevronsRight,
} from "lucide-react";
import type { ProcessDocument } from "@/lib/types/process";

// --- localStorage helpers ---
function loadState(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  const v = localStorage.getItem(key);
  return v === null ? fallback : v === "true";
}
function loadNumber(key: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const v = localStorage.getItem(key);
  return v === null ? fallback : Number(v);
}
function save(key: string, value: string) {
  if (typeof window !== "undefined") localStorage.setItem(key, value);
}

// --- Resize hook ---
function useResizable(storageKey: string, defaultWidth: number, minWidth: number, maxWidth: number, side: "left" | "right") {
  const [width, setWidth] = useState(defaultWidth);
  const isDragging = useRef(false);

  useEffect(() => {
    setWidth(loadNumber(storageKey, defaultWidth));
  }, [storageKey, defaultWidth]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const startX = e.clientX;
    const startWidth = width;

    function onMove(ev: MouseEvent) {
      if (!isDragging.current) return;
      const delta = side === "left" ? ev.clientX - startX : startX - ev.clientX;
      const newW = Math.min(maxWidth, Math.max(minWidth, startWidth + delta));
      setWidth(newW);
    }
    function onUp() {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      // persist on release
      save(storageKey, String(Math.min(maxWidth, Math.max(minWidth, width))));
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [width, storageKey, minWidth, maxWidth, side]);

  // persist whenever width changes (debounce via ref)
  useEffect(() => { save(storageKey, String(width)); }, [width, storageKey]);

  return { width, handleMouseDown };
}

// --- Icons ---
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
 * Sidebar esquerda — Árvore de arquivos do processo
 */
export function FilesSidebar({ documents, onSelectDocument }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const { width, handleMouseDown } = useResizable("sidebar-files-width", 200, 140, 350, "left");

  useEffect(() => { setOpen(loadState("sidebar-files-open", false)); }, []);
  function toggle() {
    const next = !open;
    setOpen(next);
    save("sidebar-files-open", String(next));
  }

  const pdfs = documents.filter((d) => d.type === "pdf");
  const pecas = documents.filter((d) => d.type === "peca");
  const indices = documents.filter((d) => d.type === "index");
  const notes = documents.filter((d) => d.type === "notes");

  return (
    <div className="h-full flex shrink-0">
      <div
        className="h-full flex flex-col overflow-hidden"
        style={{ width: open ? `${width}px` : "auto", background: "rgba(250,250,250,0.8)" }}
      >
        <button
          className={`flex items-center gap-1.5 px-2 py-2 text-[10px] font-semibold uppercase border-b shrink-0 transition-colors ${
            open ? "text-zinc-700 bg-zinc-100" : "text-zinc-400 hover:text-zinc-600"
          }`}
          onClick={toggle}
          title="Arquivos do processo"
        >
          {open ? <ChevronDown className="h-3 w-3" /> : <PanelLeft className="h-3 w-3" />}
          {open && <span className="flex-1">Arquivos</span>}
          {open && <ChevronsLeft className="h-3 w-3 text-zinc-400 hover:text-zinc-600" />}
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
      {/* Resize handle */}
      {open && (
        <div
          className="w-1 bg-border hover:bg-primary/30 cursor-col-resize shrink-0 transition-colors active:bg-primary/50"
          onMouseDown={handleMouseDown}
        />
      )}
    </div>
  );
}

// --- Index Sidebar ---
interface OutlineItem {
  level: number;
  text: string;
  index: number;
  headingId?: string;
}

export function IndexSidebar({
  gdocsId,
  onNavigateToHeading,
}: {
  gdocsId?: string;
  onNavigateToHeading?: (headingId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const loadedDocIdRef = useRef<string | null>(null);
  const lastFetchRef = useRef<number>(0);
  const { width, handleMouseDown } = useResizable("sidebar-index-width", 200, 140, 350, "right");

  useEffect(() => { setOpen(loadState("sidebar-index-open", false)); }, []);

  const fetchOutline = useCallback(async (docId: string, force = false) => {
    if (!force && loadedDocIdRef.current === docId) return;
    lastFetchRef.current = Date.now();
    setLoading(true);
    try {
      const res = await fetch(`/api/gdocs/outline?docId=${docId}&_t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      setOutline(data.outline ?? []);
      loadedDocIdRef.current = docId;
    } catch {
      setOutline([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carrega outline quando o painel está aberto e o doc muda
  useEffect(() => {
    if (open && gdocsId) {
      fetchOutline(gdocsId);
    }
  }, [open, gdocsId, fetchOutline]);

  // Auto-refresh a cada 15s enquanto o painel está aberto
  useEffect(() => {
    if (!open || !gdocsId) return;
    const interval = setInterval(() => fetchOutline(gdocsId, true), 15_000);
    return () => clearInterval(interval);
  }, [open, gdocsId, fetchOutline]);

  // Refresh ao voltar do iframe (window recupera focus quando usuário clica fora do iframe)
  useEffect(() => {
    if (!open || !gdocsId) return;
    const handleFocus = () => {
      // Throttle: só refrescar se último fetch foi há mais de 5s
      if (Date.now() - lastFetchRef.current < 5_000) return;
      fetchOutline(gdocsId, true);
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [open, gdocsId, fetchOutline]);

  function handleToggle() {
    const next = !open;
    setOpen(next);
    save("sidebar-index-open", String(next));
  }

  function handleRefresh() {
    if (gdocsId) fetchOutline(gdocsId, true);
  }

  return (
    <div className="h-full flex shrink-0">
      {/* Resize handle */}
      {open && (
        <div
          className="w-1 bg-border hover:bg-primary/30 cursor-col-resize shrink-0 transition-colors active:bg-primary/50"
          onMouseDown={handleMouseDown}
        />
      )}
      <div
        className="h-full flex flex-col overflow-hidden"
        style={{ width: open ? `${width}px` : "auto", background: "rgba(250,250,250,0.8)" }}
      >
        <button
          className={`flex items-center gap-1.5 px-2 py-2 text-[10px] font-semibold uppercase border-b shrink-0 transition-colors ${
            open ? "text-zinc-700 bg-zinc-100" : "text-zinc-400 hover:text-zinc-600"
          }`}
          onClick={handleToggle}
          title="Índice do documento"
        >
          {open ? <ChevronsRight className="h-3 w-3 text-zinc-400 hover:text-zinc-600" /> : <PanelRight className="h-3 w-3" />}
          {open && <span className="flex-1">Índice</span>}
          {open && (
            <RefreshCw
              className={`h-2.5 w-2.5 text-zinc-400 hover:text-zinc-600 transition-colors ${loading ? "animate-spin" : ""}`}
              onClick={(e) => { e.stopPropagation(); handleRefresh(); }}
            />
          )}
        </button>

        {open && (
          <ScrollArea className="flex-1 min-h-0">
            {loading && outline.length === 0 ? (
              <div className="px-3 py-3 text-[11px] text-zinc-400">Carregando...</div>
            ) : outline.length === 0 ? (
              <div className="px-3 py-3 text-[11px] text-zinc-400 italic">
                Nenhum título encontrado
              </div>
            ) : (
              <div className="py-1">
                {outline.map((item, i) => (
                  <button
                    key={i}
                    className={`w-full text-left px-2 py-1 text-[11px] text-zinc-600 hover:bg-zinc-100 rounded truncate block ${
                      item.headingId ? "cursor-pointer" : ""
                    }`}
                    style={{ paddingLeft: `${8 + (item.level - 1) * 12}px` }}
                    title={item.text}
                    onClick={() => {
                      if (item.headingId && onNavigateToHeading) {
                        onNavigateToHeading(item.headingId);
                      }
                    }}
                  >
                    <span className={item.level === 1 ? "font-semibold" : item.level === 2 ? "font-medium" : ""}>
                      {item.text}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
