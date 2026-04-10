"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot, Play, Search, Shield, Scale, CheckCircle, Palette, Clock, Cpu, BookOpen, Loader2,
} from "lucide-react";
import { useAgents } from "@/hooks/use-agents";
import { AGENTS } from "@/lib/types/agent";

const AGENT_ICONS: Record<string, React.ReactNode> = {
  "pesquisador-documental": <Search className="h-3.5 w-3.5" />,
  "validador-probatorio": <Shield className="h-3.5 w-3.5" />,
  "critico-judicial": <Scale className="h-3.5 w-3.5" />,
  "revisor-completude": <CheckCircle className="h-3.5 w-3.5" />,
  "revisor-estilo": <Palette className="h-3.5 w-3.5" />,
  "analista-prescricao": <Clock className="h-3.5 w-3.5" />,
  "indexador": <BookOpen className="h-3.5 w-3.5" />,
  "arquiteto-fluxo-claude": <Cpu className="h-3.5 w-3.5" />,
};

export function AgentPanel({
  processNumber,
  gdocsId,
}: {
  processNumber: string;
  gdocsId?: string;
}) {
  const { runs, isAnyRunning, completedRuns, startAgent, startReviewWorkflow } = useAgents();

  return (
    <div className="flex flex-col h-full">
      {/* Agent buttons */}
      <div className="p-3 border-b">
        <div className="flex items-center gap-2 mb-2">
          <Bot className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            Agentes
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {AGENTS.map((agent) => {
            const runEntry = Object.values(runs).find(
              (r) => r.agentName === agent.name && r.status === "running"
            );
            return (
              <Button
                key={agent.name}
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                disabled={isAnyRunning}
                onClick={() => startAgent(processNumber, agent.name, gdocsId)}
                title={agent.description}
              >
                {runEntry ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  AGENT_ICONS[agent.name] ?? <Bot className="h-3 w-3" />
                )}
                {agent.name.split("-").slice(0, 2).join("-")}
              </Button>
            );
          })}
        </div>
        <div className="mt-2">
          <Button
            variant="default"
            size="sm"
            className="text-xs gap-1"
            disabled={isAnyRunning}
            onClick={() => startReviewWorkflow(processNumber, gdocsId)}
          >
            {isAnyRunning ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            Revisão Completa
          </Button>
        </div>
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {completedRuns.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Nenhum agente executado ainda
            </p>
          )}
          {completedRuns.map((run) => (
            <div
              key={run.runId}
              className={`rounded-lg border p-3 text-xs ${
                run.status === "failed" ? "border-destructive/50 bg-destructive/5" : "bg-muted/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  {AGENT_ICONS[run.agentName] ?? <Bot className="h-3 w-3" />}
                  <span className="font-semibold">{run.agentName}</span>
                </div>
                <Badge
                  variant={run.status === "completed" ? "default" : "destructive"}
                  className="text-[10px] h-4"
                >
                  {run.status === "completed" ? "OK" : "ERRO"}
                </Badge>
              </div>
              {run.durationMs && (
                <span className="text-muted-foreground">
                  {(run.durationMs / 1000).toFixed(1)}s
                </span>
              )}
              {run.output && (
                <p className="mt-1.5 whitespace-pre-wrap text-muted-foreground line-clamp-6">
                  {run.output.substring(0, 500)}
                </p>
              )}
              {run.error && (
                <p className="mt-1 text-destructive">{run.error}</p>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
