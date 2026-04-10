"use client";

import { useEffect, useState, use } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  FileText, FolderOpen, ArrowLeft, ExternalLink, BookOpen, Plus,
} from "lucide-react";
import Link from "next/link";
import type { ProcessDocument } from "@/lib/types/process";
import { ChatPanel } from "@/components/chat/chat-panel";
import { AgentPanel } from "@/components/agents/agent-panel";
import { TerminalPanel } from "@/components/terminal/terminal-panel";
import { GDocsPreview } from "@/components/gdocs/gdocs-preview";
import { GDocsStatus } from "@/components/gdocs/gdocs-status";
import { useSocket } from "@/hooks/use-socket";
import { useGDocs } from "@/hooks/use-gdocs";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { useProcessStore } from "@/stores/process-store";

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
  const { connected, terminalLines, clearTerminal } = useSocket();
  const { createDocument, openInGoogleDocs, isCreating } = useGDocs();
  const { processes, fetchProcesses } = useProcessStore();

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
      // Refresh document list
      const res = await fetch(`/api/processes/${encodeURIComponent(processNumber)}`);
      setData(await res.json());
    }
  }

  function handleSlashCommand(command: string) {
    // TODO: route slash commands to appropriate handlers
    console.log("Slash command:", command);
  }

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <CommandPalette processes={processes} onCommand={handleSlashCommand} />

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Documents + optional GDocs preview */}
        <div className="w-1/2 border-r flex flex-col">
          <div className="p-3 border-b flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-mono font-semibold truncate">{processNumber}</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {pdfs.length} PDFs, {pecas.length} peças
                </span>
                <GDocsStatus isLocked={false} isConnected={connected} />
              </div>
            </div>
          </div>

          {/* GDocs preview when a document is selected */}
          {selectedGDocsId ? (
            <div className="flex-1 flex flex-col">
              <GDocsPreview gdocsId={selectedGDocsId} />
              <Button
                variant="ghost"
                size="sm"
                className="text-xs m-1"
                onClick={() => setSelectedGDocsId(null)}
              >
                Voltar à lista
              </Button>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Índices */}
                {indices.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                      Índices
                    </h3>
                    {indices.map((doc) => (
                      <div key={doc.name} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent text-sm">
                        <BookOpen className="h-4 w-4 text-green-500" />
                        <span className="truncate flex-1">{doc.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* PDFs */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                    Autos (PDFs)
                  </h3>
                  {pdfs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum PDF</p>
                  ) : (
                    pdfs.map((doc) => (
                      <div key={doc.name} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent text-sm">
                        <FolderOpen className="h-4 w-4 text-red-400" />
                        <span className="truncate flex-1 text-xs">{doc.name}</span>
                        <span className="text-xs text-muted-foreground">{formatBytes(doc.sizeBytes)}</span>
                      </div>
                    ))
                  )}
                </div>

                <Separator />

                {/* Peças */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase">Peças</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={handleNewPeca}
                      disabled={isCreating}
                    >
                      <Plus className="h-3 w-3" />
                      Nova Peça
                    </Button>
                  </div>
                  {pecas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma peça</p>
                  ) : (
                    pecas.map((doc) => (
                      <div key={doc.name} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent text-sm cursor-pointer"
                        onClick={() => doc.gdocsId && setSelectedGDocsId(doc.gdocsId)}
                      >
                        <FileText className="h-4 w-4 text-blue-400" />
                        <span className="truncate flex-1">{doc.name}</span>
                        {doc.gdocsId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              openInGoogleDocs(doc.gdocsId!);
                            }}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                        <span className="text-xs text-muted-foreground">{formatBytes(doc.sizeBytes)}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Notas */}
                {notes.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Notas</h3>
                      {notes.map((doc) => (
                        <div key={doc.name} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent text-sm">
                          <FileText className="h-4 w-4 text-amber-400" />
                          <span className="truncate flex-1">{doc.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Right: AI Panel */}
        <div className="w-1/2 flex flex-col">
          {/* Tab bar */}
          <div className="flex border-b">
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

          {/* Active tab content */}
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

          {/* Terminal */}
          <TerminalPanel lines={terminalLines} onClear={clearTerminal} />
        </div>
      </div>
    </div>
  );
}
