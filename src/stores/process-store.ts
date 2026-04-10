import { create } from "zustand";
import type { ProcessInfo } from "@/lib/types/process";

interface ProcessStore {
  processes: ProcessInfo[];
  loading: boolean;
  selectedProcess: string | null;
  fetchProcesses: () => Promise<void>;
  selectProcess: (processNumber: string | null) => void;
}

export const useProcessStore = create<ProcessStore>((set) => ({
  processes: [],
  loading: false,
  selectedProcess: null,

  fetchProcesses: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/processes");
      const data = await res.json();
      set({ processes: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  selectProcess: (processNumber) => set({ selectedProcess: processNumber }),
}));
