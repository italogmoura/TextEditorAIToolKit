"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { Search, FolderOpen, Bot, FileText, Settings } from "lucide-react";
import type { ProcessInfo } from "@/lib/types/process";

const SLASH_COMMANDS = [
  { name: "/revisar", description: "Revisão Completa", icon: "bot" },
  { name: "/elaborar", description: "Elaborar Peça", icon: "file" },
  { name: "/novo-processo", description: "Novo Processo", icon: "folder" },
  { name: "/importar", description: "Importar Processo", icon: "folder" },
  { name: "/indexar-eproc", description: "Indexar Autos (EPROC)", icon: "bot" },
  { name: "/indexar-unico", description: "Indexar Autos (Único)", icon: "bot" },
  { name: "/prescricao", description: "Analisar Prescrição", icon: "bot" },
  { name: "/checklist", description: "Checklist", icon: "file" },
  { name: "/backup", description: "Backup", icon: "settings" },
];

export function CommandPalette({
  processes,
  onCommand,
}: {
  processes: ProcessInfo[];
  onCommand?: (command: string, processNumber?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  // Cmd+K handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery("");
        setSelectedIndex(0);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const results = useMemo(() => {
    const q = query.toLowerCase();
    const items: Array<{ type: "process" | "command"; label: string; description: string; value: string }> = [];

    // Match processes
    for (const p of processes) {
      if (!q || p.number.includes(q)) {
        items.push({
          type: "process",
          label: p.number,
          description: `${p.pecasCount} peças, ${p.pdfsCount} PDFs`,
          value: p.number,
        });
      }
    }

    // Match slash commands
    for (const cmd of SLASH_COMMANDS) {
      if (!q || cmd.name.includes(q) || cmd.description.toLowerCase().includes(q)) {
        items.push({
          type: "command",
          label: cmd.name,
          description: cmd.description,
          value: cmd.name,
        });
      }
    }

    return items.slice(0, 12);
  }, [query, processes]);

  const handleSelect = useCallback(
    (item: (typeof results)[0]) => {
      setOpen(false);
      if (item.type === "process") {
        router.push(`/processo/${encodeURIComponent(item.value)}`);
      } else {
        onCommand?.(item.value);
      }
    },
    [router, onCommand]
  );

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results[selectedIndex]) handleSelect(results[selectedIndex]);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, results, selectedIndex, handleSelect]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 gap-0 max-w-lg">
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Buscar processo, ação ou comando..."
            className="flex-1 px-3 py-3 text-sm bg-transparent outline-none"
            autoFocus
          />
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {results.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Nenhum resultado
            </div>
          )}
          {results.map((item, i) => (
            <div
              key={`${item.type}-${item.value}`}
              className={`flex items-center gap-3 px-3 py-2 text-sm cursor-pointer ${
                i === selectedIndex ? "bg-accent" : "hover:bg-accent/50"
              }`}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              {item.type === "process" ? (
                <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <Bot className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <span className="font-mono">{item.label}</span>
                <span className="text-muted-foreground ml-2">{item.description}</span>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
