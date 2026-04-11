"use client";

import { Bot, User, Check, X, FileCheck, AlertTriangle } from "lucide-react";
import type { ChatMessage } from "@/stores/chat-store";

export function Message({
  message,
  onAccept,
  onReject,
}: {
  message: ChatMessage;
  onAccept?: () => void;
  onReject?: () => void;
}) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  return (
    <div className={`flex gap-2 ${isUser ? "justify-end" : ""}`}>
      {!isUser && (
        <div
          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
        >
          <Bot className="h-3 w-3 text-white" />
        </div>
      )}
      <div className="max-w-[88%] space-y-1.5">
        <div
          className="text-[13px] leading-relaxed"
          style={{
            borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
            padding: "10px 14px",
            background: isUser
              ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
              : isSystem
              ? "#fef2f2"
              : "#f4f4f5",
            color: isUser ? "white" : isSystem ? "#b91c1c" : "#27272a",
          }}
        >
          {message.agentName && (
            <span className="text-[10px] font-semibold opacity-60 block mb-0.5">
              {message.agentName}
            </span>
          )}
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Accept / Reject buttons — Tiptap style */}
        {!isUser && !isSystem && onAccept && (
          <div className="flex items-center gap-1.5 pl-1">
            <button
              onClick={onReject}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-zinc-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              style={{ border: "1px solid rgba(0,0,0,0.08)" }}
            >
              <X className="h-3 w-3" />
              Reject
            </button>
            <button
              onClick={onAccept}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-white transition-colors"
              style={{ background: "linear-gradient(135deg, #16a34a, #15803d)" }}
            >
              <Check className="h-3 w-3" />
              Accept
            </button>
            <button
              onClick={onReject}
              className="flex items-center justify-center w-6 h-6 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Indicador de edição aplicada ao Google Docs */}
        {message.editApplied && (
          <div className="flex items-center gap-1 pl-1 text-[11px] text-emerald-600">
            <FileCheck className="h-3 w-3" />
            <span>Documento editado</span>
          </div>
        )}
        {message.editError && (
          <div className="flex items-center gap-1 pl-1 text-[11px] text-amber-600">
            <AlertTriangle className="h-3 w-3" />
            <span>{message.editError}</span>
          </div>
        )}

        <span className="text-[9px] text-zinc-300 pl-1">
          {new Date(message.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      {isUser && (
        <div className="shrink-0 w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center">
          <User className="h-3 w-3 text-zinc-500" />
        </div>
      )}
    </div>
  );
}
