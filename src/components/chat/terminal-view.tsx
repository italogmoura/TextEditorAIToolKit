"use client";

import { useRef, useEffect } from "react";
import { X } from "lucide-react";
import { useChatStore } from "@/stores/chat-store";

export function TerminalView({ onClose }: { onClose: () => void }) {
  const { messages } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Coletar raw outputs de todas as mensagens assistant
  const logs = messages
    .filter((m) => m.role === "assistant" && m.rawOutput)
    .map((m) => ({
      timestamp: m.timestamp,
      output: m.rawOutput!,
    }));

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length]);

  return (
    <div className="flex flex-col h-full bg-zinc-900 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-800 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          </div>
          <span className="text-[11px] text-zinc-400 font-mono">Claude Code CLI</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed text-green-400"
      >
        {logs.length === 0 ? (
          <p className="text-zinc-500">Nenhuma interacao com o Claude Code CLI ainda...</p>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="mb-4">
              <div className="text-zinc-500 text-[10px] mb-1">
                $ claude --print [{new Date(log.timestamp).toLocaleTimeString("pt-BR")}]
              </div>
              <pre className="whitespace-pre-wrap text-zinc-300 break-words">
                {log.output}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
