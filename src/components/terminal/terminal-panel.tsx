"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronUp, Trash2, Terminal } from "lucide-react";

interface TerminalLine {
  timestamp: string;
  agent?: string;
  text: string;
  type: "info" | "error" | "tool";
}

export function TerminalPanel({
  lines,
  onClear,
}: {
  lines: TerminalLine[];
  onClear: () => void;
}) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="border-t bg-zinc-950 text-zinc-300">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-1.5 cursor-pointer hover:bg-zinc-900"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2 text-xs">
          <Terminal className="h-3.5 w-3.5" />
          <span className="font-semibold">Terminal</span>
          {lines.length > 0 && (
            <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-[10px]">
              {lines.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-zinc-500 hover:text-zinc-300"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          {collapsed ? (
            <ChevronUp className="h-4 w-4 text-zinc-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          )}
        </div>
      </div>

      {/* Content */}
      {!collapsed && (
        <ScrollArea className="h-48">
          <div className="p-2 font-mono text-xs space-y-0.5">
            {lines.length === 0 && (
              <div className="text-zinc-600 py-4 text-center">
                Nenhuma saída ainda
              </div>
            )}
            {lines.map((line, i) => (
              <div
                key={i}
                className={`flex gap-2 ${
                  line.type === "error" ? "text-red-400" : line.type === "tool" ? "text-blue-400" : ""
                }`}
              >
                <span className="text-zinc-600 shrink-0">
                  {new Date(line.timestamp).toLocaleTimeString("pt-BR")}
                </span>
                {line.agent && (
                  <span className="text-yellow-500 shrink-0">[{line.agent}]</span>
                )}
                <span className="break-all">{line.text}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
