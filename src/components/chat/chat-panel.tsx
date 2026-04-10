"use client";

import { useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot } from "lucide-react";
import { useChatStore } from "@/stores/chat-store";
import { Message } from "./message";
import { ChatInput } from "./input";

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

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSend(message: string) {
    sendMessage(processNumber, message, gdocsId);
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Digite uma mensagem ou acione um agente</p>
              <p className="text-xs mt-1">
                Use{" "}
                <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">
                  /
                </kbd>{" "}
                para slash commands
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <Message key={msg.id} message={msg} />
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bot className="h-4 w-4 animate-pulse" />
              <span>Processando...</span>
            </div>
          )}
        </div>
      </ScrollArea>

      <ChatInput
        onSend={handleSend}
        onSlashCommand={onSlashCommand}
        disabled={isLoading}
      />
    </div>
  );
}
