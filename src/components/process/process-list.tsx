"use client";

import { useEffect, useState } from "react";
import { ProcessCard } from "./process-card";
import type { ProcessInfo } from "@/lib/types/process";

export function ProcessList() {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/processes")
      .then((res) => res.json())
      .then((data) => {
        setProcesses(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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
