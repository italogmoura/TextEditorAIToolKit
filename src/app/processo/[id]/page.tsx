"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  FileText, FolderOpen, ArrowLeft, ExternalLink, BookOpen, Plus, X,
  PanelLeftClose, PanelLeftOpen, Columns2, PanelRight,
} from "lucide-react";
import Link from "next/link";
import type { ProcessDocument } from "@/lib/types/process";
import { AgentPanel } from "@/components/agents/agent-panel";
import { AiBar } from "@/components/chat/ai-bar";
import { TerminalPanel } from "@/components/terminal/terminal-panel";
import { GDocsPreview, GDocsActions } from "@/components/gdocs/gdocs-preview";
import { GDocsStatus } from "@/components/gdocs/gdocs-status";
import { PdfViewer } from "@/components/pdf/pdf-viewer";
import { useSocket } from "@/hooks/use-socket";
import { useGDocs } from "@/hooks/use-gdocs";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { useProcessStore } from "@/stores/process-store";
import { FilesSidebar, IndexSidebar } from "@/components/layout/doc-sidebar";

interface ProcessData {
  processNumber: string;
  documents: ProcessDocument[];
}

export default function ProcessoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const processNumber = decodeURIComponent(id);
  const [data, setData] = useState<ProcessData | null>(null);
  const [selectedGDocsId, setSelectedGDocsId] = useState<string | null>(null);
  const [selectedPdfPath, setSelectedPdfPath] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<ProcessDocument | null>(null);
  const [filePreviewContent, setFilePreviewContent] = useState<string | null>(null);
  const { connected, terminalLines, clearTerminal } = useSocket();
  const { createDocument, openInGoogleDocs, isCreating } = useGDocs();
  const { processes, fetchProcesses } = useProcessStore();

  // ---- Resizable panel ----
  const [leftPanelPercent, setLeftPanelPercent] = useState(100);
  const [rightPanelVisible, setRightPanelVisible] = useState(false);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const percent = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftPanelPercent(Math.min(85, Math.max(25, percent)));
    }
    function handleMouseUp() {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    }
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // ---- Data ----
  useEffect(() => {
    fetch(`/api/processes/${encodeURIComponent(processNumber)}`)
      .then((res) => res.json())
      .then(setData);
    fetchProcesses();
  }, [processNumber, fetchProcesses]);

  const pdfs = data?.documents.filter((d) => d.type === "pdf") ?? [];
  const pecas = data?.documents.filter((d) => d.type === "peca") ?? [];
  const indices = data?.documents.filter((d) => d.type === "index") ?? [];
  const notes = data?.documents.filter((d) => d.type === "notes") ?? [];

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  async function handleNewPeca() {
    const name = prompt("Nome da peça (ex: parecer, denuncia):");
    if (!name) return;
    const result = await createDocument(processNumber, name, `${processNumber} — ${name}`);
    if (result.gdocsId) {
      setSelectedGDocsId(result.gdocsId);
      const res = await fetch(`/api/processes/${encodeURIComponent(processNumber)}`);
      setData(await res.json());
    }
  }

  function handleSlashCommand(command: string) {
    console.log("Slash command:", command);
  }

  const hasPreview = selectedPdfPath || selectedGDocsId || selectedFile;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header>
        <div className="flex items-center gap-2 flex-1 min-w-0 mx-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <ArrowLeft className="h-3 w-3" />
            </Button>
          </Link>
          <span className="text-[11px] font-mono font-semibold truncate">{processNumber}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">{pdfs.length} PDFs, {pecas.length} peças</span>
          <GDocsStatus isLocked={false} isConnected={connected} />
          <div className="flex items-center gap-0.5 ml-auto shrink-0">
            {rightPanelVisible && (
              <>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setLeftPanelPercent(75)} title="Editor grande">
                  <PanelLeftOpen className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setLeftPanelPercent(50)} title="Metade">
                  <Columns2 className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setLeftPanelPercent(33)} title="Editor pequeno">
                  <PanelLeftClose className="h-3 w-3" />
                </Button>
              </>
            )}
            <Button
              variant="ghost" size="icon" className="h-5 w-5"
              onClick={() => {
                if (rightPanelVisible) {
                  setRightPanelVisible(false);
                  setLeftPanelPercent(100);
                } else {
                  setRightPanelVisible(true);
                  setLeftPanelPercent(65);
                }
              }}
              title={rightPanelVisible ? "Fechar agentes" : "Abrir agentes"}
            >
              <PanelRight className={`h-3 w-3 ${rightPanelVisible ? "text-primary" : ""}`} />
            </Button>
          </div>
          {selectedGDocsId && (
            <GDocsActions
              gdocsId={selectedGDocsId}
              filePath={pecas.find((d) => d.gdocsId === selectedGDocsId)?.path}
              onRemigrate={async () => {
                const doc = pecas.find((d) => d.gdocsId === selectedGDocsId);
                if (!doc?.path || !doc.name.endsWith(".docx")) return;
                const docName = doc.name.replace(/\.docx$/, "");
                const res = await fetch("/api/gdocs/migrate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ processNumber, filePath: doc.path, documentName: docName }),
                });
                const result = await res.json();
                if (result.gdocsId) {
                  setSelectedGDocsId(result.gdocsId);
                  const refreshRes = await fetch(`/api/processes/${encodeURIComponent(processNumber)}`);
                  setData(await refreshRes.json());
                }
              }}
            />
          )}
          <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono text-muted-foreground shrink-0">⌘K</kbd>
        </div>
      </Header>
      <CommandPalette processes={processes} onCommand={handleSlashCommand} />

      <div className="flex-1 flex overflow-hidden" ref={containerRef}>
        {/* ===== LEFT PANEL ===== */}
        <div
          className="flex flex-col overflow-hidden relative"
          style={{ width: `${leftPanelPercent}%` }}
        >

          {/* Content area with optional sidebar */}
          <div className="flex-1 flex overflow-hidden">
            {/* Files sidebar — esquerda */}
            {hasPreview && data && (
              <FilesSidebar
                documents={data.documents}
                onSelectDocument={(doc) => {
                  if (doc.type === "pdf") {
                    setSelectedPdfPath(doc.path); setSelectedGDocsId(null); setSelectedFile(null);
                  } else if (doc.gdocsId) {
                    setSelectedGDocsId(doc.gdocsId); setSelectedPdfPath(null); setSelectedFile(null);
                  } else if (doc.name.endsWith(".md")) {
                    setSelectedFile(doc); setSelectedPdfPath(null); setSelectedGDocsId(null);
                    fetch(`/api/file?path=${encodeURIComponent(doc.path)}`)
                      .then((r) => r.json())
                      .then((d) => setFilePreviewContent(d.content ?? "Erro"))
                      .catch(() => setFilePreviewContent("Erro ao carregar"));
                  } else {
                    setSelectedFile(doc); setSelectedPdfPath(null); setSelectedGDocsId(null); setFilePreviewContent(null);
                  }
                }}
              />
            )}

            {/* Viewer area */}
            <div className="flex-1 overflow-hidden relative min-h-0 flex flex-col">
          {selectedPdfPath ? (
            <div className="flex-1 overflow-hidden">
              <PdfViewer
                filePath={selectedPdfPath}
                onClose={() => setSelectedPdfPath(null)}
              />
            </div>
          ) : selectedFile && !selectedGDocsId ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 shrink-0">
                <span className="text-xs font-medium truncate">{selectedFile.name}</span>
                <div className="flex gap-1">
                  {selectedFile.name.endsWith(".docx") && (
                    <Button
                      variant="default"
                      size="sm"
                      className="h-6 text-xs gap-1"
                      disabled={isCreating}
                      onClick={async () => {
                        const docName = selectedFile.name.replace(/\.docx$/, "");
                        const res = await fetch("/api/gdocs/migrate", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            processNumber,
                            filePath: selectedFile.path,
                            documentName: docName,
                          }),
                        });
                        const result = await res.json();
                        if (result.gdocsId) {
                          setSelectedGDocsId(result.gdocsId);
                          setSelectedFile(null);
                          const refreshRes = await fetch(`/api/processes/${encodeURIComponent(processNumber)}`);
                          setData(await refreshRes.json());
                        } else {
                          alert(result.error || "Erro na migração");
                        }
                      }}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Migrar para Google Docs
                    </Button>
                  )}
                  <Button
                    variant="ghost" size="sm" className="h-6 text-xs"
                    onClick={() => { setSelectedFile(null); setFilePreviewContent(null); }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {filePreviewContent ? (
                <ScrollArea className="flex-1 p-4">
                  <pre className="text-xs font-mono whitespace-pre-wrap break-words">{filePreviewContent}</pre>
                </ScrollArea>
              ) : selectedFile.name.endsWith(".docx") ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  <div className="text-center">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Arquivo .docx sem Google Docs vinculado</p>
                    <p className="text-xs mt-1">Clique em &quot;Migrar para Google Docs&quot; para editar online</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  Carregando...
                </div>
              )}
            </div>
          ) : selectedGDocsId ? (
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <GDocsPreview gdocsId={selectedGDocsId} />
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {indices.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Índices</h3>
                    {indices.map((doc) => (
                      <div key={doc.name} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent text-sm">
                        <BookOpen className="h-4 w-4 text-green-500 shrink-0" />
                        <span className="truncate">{doc.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Autos (PDFs)</h3>
                  {pdfs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum PDF</p>
                  ) : (
                    pdfs.map((doc) => (
                      <div
                        key={doc.name}
                        className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent text-sm cursor-pointer"
                        onClick={() => { setSelectedPdfPath(doc.path); setSelectedGDocsId(null); setSelectedFile(null); }}
                      >
                        <FolderOpen className="h-4 w-4 text-red-400 shrink-0" />
                        <span className="truncate text-xs">{doc.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{formatBytes(doc.sizeBytes)}</span>
                      </div>
                    ))
                  )}
                </div>

                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase">Peças</h3>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleNewPeca} disabled={isCreating}>
                      <Plus className="h-3 w-3" />
                      Nova Peça
                    </Button>
                  </div>
                  {pecas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma peça</p>
                  ) : (
                    pecas.map((doc) => (
                      <div key={doc.name} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent text-sm cursor-pointer"
                        onClick={async () => {
                          if (doc.gdocsId) {
                            setSelectedGDocsId(doc.gdocsId); setSelectedPdfPath(null); setSelectedFile(null);
                          } else if (doc.name.endsWith(".md")) {
                            setSelectedFile(doc); setSelectedPdfPath(null); setSelectedGDocsId(null);
                            try {
                              const res = await fetch(`/api/file?path=${encodeURIComponent(doc.path)}`);
                              const d = await res.json();
                              setFilePreviewContent(d.content ?? "Erro ao carregar");
                            } catch { setFilePreviewContent("Erro ao carregar arquivo"); }
                          } else {
                            setSelectedFile(doc); setSelectedPdfPath(null); setSelectedGDocsId(null); setFilePreviewContent(null);
                          }
                        }}
                      >
                        <FileText className="h-4 w-4 text-blue-400 shrink-0" />
                        <span className="truncate">{doc.name}</span>
                        {doc.gdocsId && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                            onClick={(e) => { e.stopPropagation(); openInGoogleDocs(doc.gdocsId!); }}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                        <span className="text-xs text-muted-foreground shrink-0">{formatBytes(doc.sizeBytes)}</span>
                      </div>
                    ))
                  )}
                </div>

                {notes.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Notas</h3>
                      {notes.map((doc) => (
                        <div key={doc.name} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent text-sm">
                          <FileText className="h-4 w-4 text-amber-400 shrink-0" />
                          <span className="truncate">{doc.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          )}

          {/* AI Bar — only when a document is open */}
          {hasPreview && (
            <AiBar
              processNumber={processNumber}
              gdocsId={selectedGDocsId ?? undefined}
              onSlashCommand={handleSlashCommand}
            />
          )}
            </div>{/* close viewer area */}

            {/* Index sidebar — direita */}
            {hasPreview && <IndexSidebar />}
          </div>{/* close flex container (sidebar + viewer) */}
        </div>

        {/* ===== RIGHT PANEL: Agentes + Terminal ===== */}
        {rightPanelVisible && (
          <>
            <div
              className="w-1 bg-border hover:bg-primary/30 cursor-col-resize shrink-0 transition-colors active:bg-primary/50"
              onMouseDown={handleMouseDown}
            />
            <div
              className="flex flex-col overflow-hidden"
              style={{ width: `${100 - leftPanelPercent}%` }}
            >
              <div className="flex items-center justify-between border-b shrink-0 px-3 py-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Agentes</span>
                <button
                  className="text-zinc-400 hover:text-zinc-600 transition-colors"
                  onClick={() => { setRightPanelVisible(false); setLeftPanelPercent(100); }}
                  title="Fechar painel"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <AgentPanel processNumber={processNumber} gdocsId={selectedGDocsId ?? undefined} />
              </div>
              <TerminalPanel lines={terminalLines} onClear={clearTerminal} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
