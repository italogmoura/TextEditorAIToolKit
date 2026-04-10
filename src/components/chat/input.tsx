"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";

const SLASH_COMMANDS = [
  { command: "/revisar", description: "Revisão Completa (4 agentes)", icon: "🔍" },
  { command: "/elaborar", description: "Elaborar Peça", icon: "📝" },
  { command: "/indexar-eproc", description: "Indexar Autos (EPROC)", icon: "📋" },
  { command: "/indexar-unico", description: "Indexar Autos (Único)", icon: "📋" },
  { command: "/prescricao", description: "Analisar Prescrição", icon: "⏱" },
  { command: "/checklist", description: "Checklist", icon: "✅" },
  { command: "/backup", description: "Backup", icon: "💾" },
];

export function ChatInput({
  onSend,
  onSlashCommand,
  disabled,
}: {
  onSend: (message: string) => void;
  onSlashCommand?: (command: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = value.startsWith("/")
    ? SLASH_COMMANDS.filter((c) => c.command.startsWith(value))
    : [];

  useEffect(() => {
    setShowAutocomplete(value.startsWith("/") && suggestions.length > 0);
    setSelectedSuggestion(0);
  }, [value, suggestions.length]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || disabled) return;

    if (value.startsWith("/") && onSlashCommand) {
      const cmd = SLASH_COMMANDS.find((c) => c.command === value.trim());
      if (cmd) {
        onSlashCommand(cmd.command);
        setValue("");
        return;
      }
    }

    onSend(value.trim());
    setValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showAutocomplete) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSuggestion((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSuggestion((i) => Math.max(i - 1, 0));
    } else if (e.key === "Tab" || (e.key === "Enter" && showAutocomplete)) {
      e.preventDefault();
      const selected = suggestions[selectedSuggestion];
      if (selected) {
        setValue(selected.command);
        setShowAutocomplete(false);
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative px-3 pb-3 pt-1">
      {/* Autocomplete — Tiptap style dropdown */}
      {showAutocomplete && (
        <div
          className="absolute bottom-full left-3 right-3 mb-1.5 overflow-hidden"
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
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                  i === selectedSuggestion ? "bg-zinc-50" : "hover:bg-zinc-50"
                }`}
                onClick={() => {
                  setValue(s.command);
                  setShowAutocomplete(false);
                  inputRef.current?.focus();
                }}
              >
                <span className="text-base">{s.icon}</span>
                <span className="font-medium text-zinc-700">{s.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input — Tiptap style: pill-shaped, subtle border */}
      <div
        className="flex items-center gap-2"
        style={{
          borderRadius: "12px",
          border: "1px solid rgba(0,0,0,0.08)",
          background: "rgba(0,0,0,0.02)",
          padding: "4px 4px 4px 12px",
        }}
      >
        <Sparkles className="h-3.5 w-3.5 text-zinc-300 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tell AI what else needs to be changed..."
          className="flex-1 text-sm bg-transparent outline-none placeholder:text-zinc-300"
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={!value.trim() || disabled}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-white transition-all disabled:opacity-30"
          style={{
            background: value.trim() ? "linear-gradient(135deg, #7c3aed, #6d28d9)" : "#d4d4d8",
          }}
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </form>
  );
}
