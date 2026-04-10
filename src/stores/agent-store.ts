import { create } from "zustand";

export interface AgentRun {
  runId: string;
  agentName: string;
  status: "pending" | "running" | "completed" | "failed";
  output?: string;
  error?: string;
  durationMs?: number;
  progress?: number;
}

interface AgentStore {
  runs: Record<string, AgentRun>;
  activeWorkflow: string | null;

  startAgent: (processNumber: string, agentName: string, gdocsId?: string) => Promise<void>;
  startReviewWorkflow: (processNumber: string, gdocsId?: string) => Promise<void>;
  clearRuns: () => void;
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  runs: {},
  activeWorkflow: null,

  startAgent: async (processNumber, agentName, gdocsId) => {
    const tempId = crypto.randomUUID();
    set((state) => ({
      runs: {
        ...state.runs,
        [tempId]: { runId: tempId, agentName, status: "running" },
      },
    }));

    try {
      const res = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ processNumber, agentName, gdocsId }),
      });
      const data = await res.json();

      set((state) => ({
        runs: {
          ...state.runs,
          [tempId]: {
            runId: data.runId ?? tempId,
            agentName,
            status: data.exitCode === 0 ? "completed" : "failed",
            output: data.output,
            error: data.error,
            durationMs: data.durationMs,
          },
        },
      }));
    } catch {
      set((state) => ({
        runs: {
          ...state.runs,
          [tempId]: { ...state.runs[tempId], status: "failed", error: "Erro de conexão" },
        },
      }));
    }
  },

  startReviewWorkflow: async (processNumber, gdocsId) => {
    const workflowId = crypto.randomUUID();
    const agents = ["validador-probatorio", "critico-judicial", "revisor-completude", "revisor-estilo"];

    set({ activeWorkflow: workflowId });

    // Pre-populate runs as pending
    const initialRuns: Record<string, AgentRun> = {};
    for (const agent of agents) {
      initialRuns[`${workflowId}-${agent}`] = {
        runId: `${workflowId}-${agent}`,
        agentName: agent,
        status: "running",
      };
    }
    set((state) => ({ runs: { ...state.runs, ...initialRuns } }));

    try {
      const res = await fetch("/api/agents/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ processNumber, workflowName: "revisar", gdocsId }),
      });
      const data = await res.json();

      if (data.results) {
        const updatedRuns: Record<string, AgentRun> = {};
        for (const [name, result] of Object.entries(data.results) as [string, { runId: string; output: string; error?: string; exitCode: number; durationMs: number }][]) {
          updatedRuns[`${workflowId}-${name}`] = {
            runId: result.runId,
            agentName: name,
            status: result.exitCode === 0 ? "completed" : "failed",
            output: result.output,
            error: result.error,
            durationMs: result.durationMs,
          };
        }
        set((state) => ({ runs: { ...state.runs, ...updatedRuns }, activeWorkflow: null }));
      }
    } catch {
      // Mark all as failed
      const failedRuns: Record<string, AgentRun> = {};
      for (const agent of agents) {
        failedRuns[`${workflowId}-${agent}`] = {
          runId: `${workflowId}-${agent}`,
          agentName: agent,
          status: "failed",
          error: "Erro de conexão",
        };
      }
      set((state) => ({ runs: { ...state.runs, ...failedRuns }, activeWorkflow: null }));
    }
  },

  clearRuns: () => set({ runs: {}, activeWorkflow: null }),
}));
