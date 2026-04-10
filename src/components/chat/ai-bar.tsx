"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, X, Check, Bot, Loader2 } from "lucide-react";
import { useChatStore } from "@/stores/chat-store";

const SLASH_COMMANDS = [
  { command: "/revisar", description: "Revisão Completa", icon: "🔍" },
  { command: "/elaborar", description: "Elaborar Peça", icon: "📝" },
  { command: "/indexar-eproc", description: "Indexar (EPROC)", icon: "📋" },
  { command: "/prescricao", description: "Prescrição", icon: "⏱" },
  { command: "/checklist", description: "Checklist", icon: "✅" },
];

export function AiBar({
  processNumber,
  gdocsId,
  onSlashCommand,
}: {
  processNumber: string;
  gdocsId?: string;
  onSlashCommand?: (command: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState("");
  const [showSlash, setShowSlash] = useState(false);
  const [selectedCmd, setSelectedCmd] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { messages, isLoading, sendMessage } = useChatStore();

  const suggestions = value.startsWith("/")
    ? SLASH_COMMANDS.filter((c) => c.command.startsWith(value))
    : [];

  useEffect(() => {
    setShowSlash(value.startsWith("/") && suggestions.length > 0);
    setSelectedCmd(0);
  }, [value, suggestions.length]);

  // Auto-expand when there are messages or loading
  useEffect(() => {
    if (messages.length > 0 || isLoading) setExpanded(true);
  }, [messages.length, isLoading]);

  function handleSubmit() {
    if (!value.trim() || isLoading) return;

    if (value.startsWith("/") && onSlashCommand) {
      const cmd = SLASH_COMMANDS.find((c) => c.command === value.trim());
      if (cmd) { onSlashCommand(cmd.command); setValue(""); return; }
    }

    sendMessage(processNumber, value.trim(), gdocsId);
    setValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (showSlash) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedCmd((i) => Math.min(i + 1, suggestions.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedCmd((i) => Math.max(i - 1, 0)); }
      else if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        if (suggestions[selectedCmd]) { setValue(suggestions[selectedCmd].command); setShowSlash(false); }
      }
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 flex flex-col items-center pointer-events-none">
      {/* Messages area — grows upward */}
      {expanded && hasMessages && (
        <div
          className="w-full max-w-2xl mx-auto mb-1 pointer-events-auto"
          style={{ maxHeight: "50vh", overflowY: "auto" }}
        >
          <div
            className="space-y-2 p-3"
            style={{
              borderRadius: "16px 16px 0 0",
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(16px)",
              boxShadow: "0 -4px 24px rgba(0,0,0,0.06)",
            }}
          >
            {/* Close button */}
            <div className="flex justify-end">
              <button
                className="text-zinc-300 hover:text-zinc-500 transition-colors"
                onClick={() => setExpanded(false)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role !== "user" && (
                  <div
                    className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
                  >
                    <Bot className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
                <div
                  className="max-w-[85%] text-[12px] leading-relaxed"
                  style={{
                    borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                    padding: "8px 12px",
                    background: msg.role === "user"
                      ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
                      : msg.role === "system" ? "#fef2f2" : "#f4f4f5",
                    color: msg.role === "user" ? "white" : msg.role === "system" ? "#b91c1c" : "#3f3f46",
                  }}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 pl-7">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slash command dropdown */}
      {showSlash && (
        <div
          className="w-full max-w-2xl mx-auto mb-1 pointer-events-auto"
          style={{
            borderRadius: "12px",
            background: "white",
            boxShadow: "0 4px 24px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)",
          }}
        >
          <div className="py-1.5">
            {suggestions.map((s, i) => (
              <button
                key={s.command}
                type="button"
                className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                  i === selectedCmd ? "bg-zinc-50" : "hover:bg-zinc-50"
                }`}
                onClick={() => { setValue(s.command); setShowSlash(false); textareaRef.current?.focus(); }}
              >
                <span>{s.icon}</span>
                <span className="font-medium text-zinc-700">{s.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input bar — fixed at bottom */}
      <div className="w-full max-w-2xl mx-auto px-3 pb-3 pointer-events-auto">
        <div
          className="transition-all duration-200"
          style={{
            borderRadius: focused ? "16px" : "24px",
            border: focused ? "2px solid #7c3aed" : "1px solid rgba(0,0,0,0.08)",
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(16px)",
            boxShadow: focused
              ? "0 4px 24px rgba(124,58,237,0.12), 0 0 0 3px rgba(124,58,237,0.08)"
              : "0 2px 12px rgba(0,0,0,0.06)",
            padding: focused ? "12px" : "6px 6px 6px 16px",
          }}
        >
          <div className="flex items-end gap-2">
            {!focused && <Sparkles className="h-4 w-4 text-zinc-300 shrink-0 mb-1" />}
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => { if (!value) setTimeout(() => setFocused(false), 150); }}
              onKeyDown={handleKeyDown}
              placeholder={focused ? "Edit this document with AI..." : "Tell AI what else needs to be changed..."}
              rows={focused ? 3 : 1}
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-zinc-300 resize-none leading-relaxed"
              disabled={isLoading}
              style={{ minHeight: focused ? "60px" : "24px" }}
            />
            <button
              onClick={handleSubmit}
              disabled={!value.trim() || isLoading}
              className="shrink-0 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
              style={{
                width: "32px",
                height: "32px",
                background: value.trim()
                  ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
                  : "#e4e4e7",
              }}
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5 text-white" style={{ marginLeft: "1px" }} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
