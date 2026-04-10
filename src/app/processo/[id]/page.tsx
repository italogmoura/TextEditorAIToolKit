"use client";

import { useEffect, useState, use } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  FolderOpen,
  ArrowLeft,
  ExternalLink,
  Bot,
  Play,
  Search,
  BookOpen,
  Shield,
  Scale,
  CheckCircle,
  Palette,
  Clock,
  Cpu,
} from "lucide-react";
import Link from "next/link";
import type { ProcessDocument } from "@/lib/types/process";
import { AGENTS } from "@/lib/types/agent";

const AGENT_ICONS: Record<string, React.ReactNode> = {
  "pesquisador-documental": <Search className="h-4 w-4" />,
  "validador-probatorio": <Shield className="h-4 w-4" />,
  "critico-judicial": <Scale className="h-4 w-4" />,
  "revisor-completude": <CheckCircle className="h-4 w-4" />,
  "revisor-estilo": <Palette className="h-4 w-4" />,
  "analista-prescricao": <Clock className="h-4 w-4" />,
  "indexador": <BookOpen className="h-4 w-4" />,
  "arquiteto-fluxo-claude": <Cpu className="h-4 w-4" />,
};

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
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [agentRunning, setAgentRunning] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/processes/${encodeURIComponent(processNumber)}`)
      .then((res) => res.json())
      .then(setData);
  }, [processNumber]);

  const pdfs = data?.documents.filter((d) => d.type === "pdf") ?? [];
  const pecas = data?.documents.filter((d) => d.type === "peca") ?? [];
  const indices = data?.documents.filter((d) => d.type === "index") ?? [];

  async function handleChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const message = chatInput;
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: message }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ processNumber, message }),
      });
      const result = await res.json();
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.response ?? result.error ?? "Sem resposta" },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Erro ao comunicar com o servidor" },
      ]);
    }
  }

  async function handleRunAgent(agentName: string) {
    setAgentRunning(agentName);
    try {
      const res = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ processNumber, agentName }),
      });
      const result = await res.json();
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `[${agentName}] ${result.output ?? result.error ?? "Concluído"}`,
        },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: `[${agentName}] Erro ao executar agente` },
      ]);
    } finally {
      setAgentRunning(null);
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: Documents */}
        <div className="w-1/2 border-r flex flex-col">
          <div className="p-4 border-b flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h2 className="text-sm font-mono font-semibold">{processNumber}</h2>
              <p className="text-xs text-muted-foreground">
                {pdfs.length} PDFs, {pecas.length} peças
              </p>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Índices */}
              {indices.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                    Índices
                  </h3>
                  {indices.map((doc) => (
                    <div
                      key={doc.name}
                      className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent text-sm"
                    >
                      <BookOpen className="h-4 w-4 text-green-500" />
                      <span className="truncate flex-1">{doc.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* PDFs dos autos */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                  Autos (PDFs)
                </h3>
                {pdfs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum PDF</p>
                ) : (
                  pdfs.map((doc) => (
                    <div
                      key={doc.name}
                      className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent text-sm"
                    >
                      <FolderOpen className="h-4 w-4 text-red-400" />
                      <span className="truncate flex-1">{doc.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatBytes(doc.sizeBytes)}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <Separator />

              {/* Peças */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase">
                    Peças
                  </h3>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    + Nova Peça
                  </Button>
                </div>
                {pecas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma peça</p>
                ) : (
                  pecas.map((doc) => (
                    <div
                      key={doc.name}
                      className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent text-sm"
                    >
                      <FileText className="h-4 w-4 text-blue-400" />
                      <span className="truncate flex-1">{doc.name}</span>
                      {doc.gdocsId && (
                        <a
                          href={`https://docs.google.com/document/d/${doc.gdocsId}/edit`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </a>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatBytes(doc.sizeBytes)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Right panel: AI */}
        <div className="w-1/2 flex flex-col">
          {/* Agents bar */}
          <div className="p-3 border-b">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Agentes
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {AGENTS.map((agent) => (
                <Button
                  key={agent.name}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  disabled={agentRunning !== null}
                  onClick={() => handleRunAgent(agent.name)}
                  title={agent.description}
                >
                  {AGENT_ICONS[agent.name] ?? <Bot className="h-3 w-3" />}
                  {agent.name.split("-").slice(0, 2).join("-")}
                  {agentRunning === agent.name && (
                    <span className="animate-spin">⏳</span>
                  )}
                </Button>
              ))}
            </div>
            <div className="mt-2">
              <Button
                variant="default"
                size="sm"
                className="text-xs gap-1"
                disabled={agentRunning !== null}
                onClick={() => handleRunAgent("revisar")}
              >
                <Play className="h-3 w-3" />
                Revisão Completa
              </Button>
            </div>
          </div>

          {/* Chat messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-8">
                  <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Digite uma mensagem ou acione um agente</p>
                  <p className="text-xs mt-1">
                    Use <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">/</kbd>{" "}
                    para slash commands
                  </p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`text-sm ${
                    msg.role === "user"
                      ? "bg-primary/10 rounded-lg p-3"
                      : "bg-muted rounded-lg p-3"
                  }`}
                >
                  <span className="text-xs font-semibold text-muted-foreground">
                    {msg.role === "user" ? "Você" : "IA"}
                  </span>
                  <p className="mt-1 whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Chat input */}
          <form onSubmit={handleChat} className="p-3 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Digite uma mensagem ou /comando..."
                className="flex-1 px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button type="submit" size="sm" disabled={!chatInput.trim()}>
                Enviar
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
