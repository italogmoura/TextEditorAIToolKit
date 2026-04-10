"use client";

import { useEffect } from "react";
import { useProcessStore } from "@/stores/process-store";

export function useProcesses() {
  const { processes, loading, fetchProcesses } = useProcessStore();

  useEffect(() => {
    fetchProcesses();
  }, [fetchProcesses]);

  return { processes, loading };
}
