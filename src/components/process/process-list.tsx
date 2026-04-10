"use client";

import { ProcessCard } from "./process-card";
import { useProcesses } from "@/hooks/use-processes";

export function ProcessList() {
  const { processes, loading } = useProcesses();

  if (loading) {
    return (
      <div className="grid gap-3 p-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (processes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Nenhum processo encontrado
      </div>
    );
  }

  return (
    <div className="grid gap-3 p-4">
      {processes.map((p) => (
        <ProcessCard key={p.number} process={p} />
      ))}
    </div>
  );
}
