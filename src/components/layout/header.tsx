"use client";

import { Scale } from "lucide-react";

export function Header({ children }: { children?: React.ReactNode }) {
  return (
    <header className="h-9 border-b flex items-center justify-between px-3 bg-background shrink-0">
      <div className="flex items-center gap-1.5">
        <Scale className="h-3.5 w-3.5 text-primary" />
        <h1 className="text-xs font-semibold">TextEditor AI ToolKit</h1>
      </div>
      {children}
      {!children && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <kbd className="px-1 py-0.5 bg-muted rounded font-mono">⌘K</kbd>
          <span>Busca</span>
        </div>
      )}
    </header>
  );
}
