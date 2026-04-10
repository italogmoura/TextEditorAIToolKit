"use client";

import { useAgentStore } from "@/stores/agent-store";

export function useAgents() {
  const { runs, activeWorkflow, startAgent, startReviewWorkflow, clearRuns } = useAgentStore();

  const isAnyRunning = Object.values(runs).some((r) => r.status === "running") || activeWorkflow !== null;

  const completedRuns = Object.values(runs).filter((r) => r.status === "completed" || r.status === "failed");

  return {
    runs,
    activeWorkflow,
    isAnyRunning,
    completedRuns,
    startAgent,
    startReviewWorkflow,
    clearRuns,
  };
}
