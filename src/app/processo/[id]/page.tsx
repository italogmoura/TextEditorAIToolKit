"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  FileText, FolderOpen, ArrowLeft, ExternalLink, BookOpen, Plus, X,
  PanelLeftClose, PanelLeftOpen, Columns2,
} from "lucide-react";
import Link from "next/link";
import type { ProcessDocument } from "@/lib/types/process";
import { ChatPanel } from "@/components/chat/chat-panel";
import { AgentPanel } from "@/components/agents/agent-panel";
import { AiBar } from "@/components/chat/ai-bar";
import { TerminalPanel } from "@/components/terminal/terminal-panel";
import { GDocsPreview } from "@/components/gdocs/gdocs-preview";
import { GDocsStatus } from "@/components/gdocs/gdocs-status";
import { PdfViewer } from "@/components/pdf/pdf-viewer";
import { useSocket } from "@/hooks/use-socket";
import { useGDocs } from "@/hooks/use-gdocs";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { useProcessStore } from "@/stores/process-store";
import { FloatingPanel } from "@/components/layout/floating-panel";
import { PinOff, MessageSquare } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"chat" | "agents">("chat");
  const [selectedGDocsId, setSelectedGDocsId] = useState<string | null>(null);
  const [selectedPdfPath, setSelectedPdfPath] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<ProcessDocument | null>(null);
  const [filePreviewContent, setFilePreviewContent] = useState<string | null>(null);
  const { connected, terminalLines, clearTerminal } = useSocket();
  const { createDocument, openInGoogleDocs, isCreating } = useGDocs();
  const { processes, fetchProcesses } = useProcessStore();

  // ---- Panel mode: docked (lateral) or floating ----
  const [panelMode, setPanelMode] = useState<"docked" | "floating">("docked");
  const [showFloatingPanel, setShowFloatingPanel] = useState(true);

  // ---- Resizable panel ----
  const [leftPanelPercent, setLeftPanelPercent] = useState(60);
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

  // AI panel content (shared between docked and floating modes)
  const aiPanelContent = (
    <>
      <div className="flex border-b shrink-0">
        <button
          className={`flex-1 px-4 py-2 text-xs font-medium ${
            activeTab === "chat" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab("chat")}
        >
          Chat AI
        </button>
        <button
          className={`flex-1 px-4 py-2 text-xs font-medium ${
            activeTab === "agents" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab("agents")}
        >
          Agentes
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {activeTab === "chat" ? (
          <ChatPanel
            processNumber={processNumber}
            gdocsId={selectedGDocsId ?? undefined}
            onSlashCommand={handleSlashCommand}
          />
        ) : (
          <AgentPanel
            processNumber={processNumber}
            gdocsId={selectedGDocsId ?? undefined}
          />
        )}
      </div>
      <TerminalPanel lines={terminalLines} onClear={clearTerminal} />
    </>
  );

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
          {hasPreview && (
            <div className="flex items-center gap-0.5 ml-auto shrink-0">
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setLeftPanelPercent(75)} title="Editor grande">
                <PanelLeftOpen className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setLeftPanelPercent(50)} title="Metade">
                <Columns2 className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setLeftPanelPercent(33)} title="Editor pequeno">
                <PanelLeftClose className="h-3 w-3" />
              </Button>
            </div>
          )}
          <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono text-muted-foreground shrink-0">⌘K</kbd>
        </div>
      </Header>
      <CommandPalette processes={processes} onCommand={handleSlashCommand} />

      <div className="flex-1 flex overflow-hidden" ref={containerRef}>
        {/* ===== LEFT PANEL ===== */}
        <div
          className="flex flex-col overflow-hidden relative"
          style={{ width: panelMode === "floating" ? "100%" : `${leftPanelPercent}%` }}
        >

          {/* Content area */}
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
            <div className="flex-1 flex flex-col overflow-hidden">
              <GDocsPreview
                gdocsId={selectedGDocsId}
                processNumber={processNumber}
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
              <Button
                variant="ghost" size="sm" className="text-xs m-1 shrink-0"
                onClick={() => setSelectedGDocsId(null)}
              >
                Voltar à lista
              </Button>
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

          {/* AI Bar — fixed at bottom of editor, Tiptap style */}
          <AiBar
            processNumber={processNumber}
            gdocsId={selectedGDocsId ?? undefined}
            onSlashCommand={handleSlashCommand}
          />
        </div>

        {/* ===== DOCKED MODE: drag handle + right panel ===== */}
        {panelMode === "docked" && (
          <>
            <div
              className="w-1 bg-border hover:bg-primary/30 cursor-col-resize shrink-0 transition-colors active:bg-primary/50"
              onMouseDown={handleMouseDown}
            />
            <div
              className="flex flex-col overflow-hidden"
              style={{ width: `${100 - leftPanelPercent}%` }}
            >
              <div className="flex items-center justify-between border-b shrink-0 pr-1">
                <div className="flex flex-1">
                  <button
                    className={`flex-1 px-4 py-2 text-xs font-medium ${
                      activeTab === "chat" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"
                    }`}
                    onClick={() => setActiveTab("chat")}
                  >
                    Chat AI
                  </button>
                  <button
                    className={`flex-1 px-4 py-2 text-xs font-medium ${
                      activeTab === "agents" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"
                    }`}
                    onClick={() => setActiveTab("agents")}
                  >
                    Agentes
                  </button>
                </div>
                <Button
                  variant="ghost" size="icon" className="h-6 w-6"
                  onClick={() => { setPanelMode("floating"); setShowFloatingPanel(true); }}
                  title="Destacar como janela flutuante"
                >
                  <PinOff className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex-1 overflow-hidden">
                {activeTab === "chat" ? (
                  <ChatPanel processNumber={processNumber} gdocsId={selectedGDocsId ?? undefined} onSlashCommand={handleSlashCommand} />
                ) : (
                  <AgentPanel processNumber={processNumber} gdocsId={selectedGDocsId ?? undefined} />
                )}
              </div>
              <TerminalPanel lines={terminalLines} onClear={clearTerminal} />
            </div>
          </>
        )}
      </div>

      {/* ===== FLOATING MODE: AI Panel as draggable window ===== */}
      {panelMode === "floating" && (
        <>
          {/* FAB to reopen floating panel when closed */}
          {!showFloatingPanel && (
            <button
              className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
              onClick={() => setShowFloatingPanel(true)}
              title="Abrir painel AI"
            >
              <MessageSquare className="h-5 w-5" />
            </button>
          )}

          <FloatingPanel
            isVisible={showFloatingPanel}
            title="AI Panel"
            defaultWidth={420}
            defaultHeight={520}
            onClose={() => setShowFloatingPanel(false)}
            onDock={() => setPanelMode("docked")}
          >
            <div className="flex flex-col h-full">
              {aiPanelContent}
            </div>
          </FloatingPanel>
        </>
      )}
    </div>
  );
}
