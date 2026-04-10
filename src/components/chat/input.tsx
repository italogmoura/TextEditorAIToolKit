"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

const SLASH_COMMANDS = [
  { command: "/revisar", description: "Revisão Completa (4 agentes)" },
  { command: "/elaborar", description: "Elaborar Peça" },
  { command: "/indexar-eproc", description: "Indexar Autos (EPROC)" },
  { command: "/indexar-unico", description: "Indexar Autos (Único)" },
  { command: "/prescricao", description: "Analisar Prescrição" },
  { command: "/checklist", description: "Checklist" },
  { command: "/backup", description: "Backup" },
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
    <form onSubmit={handleSubmit} className="relative p-3 border-t">
      {/* Autocomplete dropdown */}
      {showAutocomplete && (
        <div className="absolute bottom-full left-3 right-3 mb-1 bg-popover border rounded-md shadow-lg overflow-hidden">
          {suggestions.map((s, i) => (
            <div
              key={s.command}
              className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer ${
                i === selectedSuggestion ? "bg-accent" : "hover:bg-accent/50"
              }`}
              onClick={() => {
                setValue(s.command);
                setShowAutocomplete(false);
                inputRef.current?.focus();
              }}
            >
              <span className="font-mono text-primary">{s.command}</span>
              <span className="text-muted-foreground text-xs">{s.description}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite uma mensagem ou /comando..."
          className="flex-1 px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          disabled={disabled}
        />
        <Button type="submit" size="sm" disabled={!value.trim() || disabled}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
