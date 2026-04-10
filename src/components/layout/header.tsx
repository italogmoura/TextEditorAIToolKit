"use client";

import { Scale } from "lucide-react";

export function Header() {
  return (
    <header className="h-14 border-b flex items-center justify-between px-4 bg-background">
      <div className="flex items-center gap-2">
        <Scale className="h-5 w-5 text-primary" />
        <h1 className="text-sm font-semibold">TextEditor AI ToolKit</h1>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
          Cmd+K
        </kbd>
        <span>Busca rápida</span>
      </div>
    </header>
  );
}
