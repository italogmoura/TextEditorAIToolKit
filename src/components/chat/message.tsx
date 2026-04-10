"use client";

import { Bot, User } from "lucide-react";
import type { ChatMessage } from "@/stores/chat-store";

export function Message({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  return (
    <div
      className={`flex gap-2 text-sm ${
        isUser ? "justify-end" : ""
      }`}
    >
      {!isUser && (
        <div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="h-3.5 w-3.5 text-primary" />
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-lg p-3 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : isSystem
            ? "bg-destructive/10 text-destructive"
            : "bg-muted"
        }`}
      >
        {message.agentName && (
          <span className="text-xs font-semibold text-muted-foreground block mb-1">
            [{message.agentName}]
          </span>
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>
        <span className="text-[10px] opacity-50 mt-1 block">
          {new Date(message.timestamp).toLocaleTimeString("pt-BR")}
        </span>
      </div>
      {isUser && (
        <div className="shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
          <User className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}
