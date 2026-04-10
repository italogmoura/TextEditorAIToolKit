"use client";

import { Header } from "@/components/layout/header";
import { ProcessList } from "@/components/process/process-list";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { useProcessStore } from "@/stores/process-store";
import { Settings } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { processes } = useProcessStore();

  return (
    <div className="flex flex-col h-screen">
      <Header>
        <div className="flex items-center gap-2 flex-1 mx-3">
          <span className="text-xs text-muted-foreground">{processes.length} processos</span>
          <div className="ml-auto flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono text-muted-foreground">⌘K</kbd>
            <Link href="/config">
              <Button variant="ghost" size="icon" className="h-5 w-5" title="Configurações">
                <Settings className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </Header>
      <CommandPalette processes={processes} />
      <main className="flex-1 overflow-hidden">
        <div className="h-full flex">
          <div className="w-full max-w-2xl mx-auto">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Processos</h2>
              <p className="text-sm text-muted-foreground">
                Selecione um processo para abrir o workspace
              </p>
            </div>
            <ScrollArea className="h-[calc(100vh-8rem)]">
              <ProcessList />
            </ScrollArea>
          </div>
        </div>
      </main>
    </div>
  );
}
