"use client";

import { useRef, useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Terminal } from "lucide-react";
import { useChatStore } from "@/stores/chat-store";
import { Message } from "./message";
import { ChatInput } from "./input";
import { TerminalView } from "./terminal-view";

export function ChatPanel({
  processNumber,
  gdocsId,
  onSlashCommand,
}: {
  processNumber: string;
  gdocsId?: string;
  onSlashCommand?: (command: string) => void;
}) {
  const { messages, isLoading, sendMessage } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showTerminal, setShowTerminal] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSend(message: string) {
    sendMessage(processNumber, message, gdocsId);
  }

  // Verificar se há rawOutput para mostrar o botão terminal
  const hasRawOutput = messages.some((m) => m.rawOutput);

  if (showTerminal) {
    return (
      <div className="flex flex-col h-full">
        <TerminalView onClose={() => setShowTerminal(false)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-3 py-3" ref={scrollRef}>
        <div className="space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-10">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: "linear-gradient(135deg, #ede9fe, #ddd6fe)" }}
              >
                <Sparkles className="h-5 w-5 text-violet-500" />
              </div>
              <p className="text-sm text-zinc-400">Diga à IA o que precisa ser alterado...</p>
              <p className="text-[11px] text-zinc-300 mt-1">
                Use <kbd className="px-1.5 py-0.5 bg-zinc-100 rounded text-[10px] font-mono">/</kbd> para comandos
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <Message key={msg.id} message={msg} />
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-zinc-400 pl-8">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-xs">Processando...</span>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="flex items-center gap-1 px-3 pb-1">
        {hasRawOutput && (
          <button
            onClick={() => setShowTerminal(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
            title="Ver saida do Claude Code CLI"
          >
            <Terminal className="h-3 w-3" />
            Terminal
          </button>
        )}
      </div>

      <ChatInput
        onSend={handleSend}
        onSlashCommand={onSlashCommand}
        disabled={isLoading}
      />
    </div>
  );
}
