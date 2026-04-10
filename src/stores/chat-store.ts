import { create } from "zustand";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  agentName?: string;
  timestamp: string;
}

interface ChatStore {
  messages: ChatMessage[];
  isLoading: boolean;
  addMessage: (msg: Omit<ChatMessage, "id" | "timestamp">) => void;
  sendMessage: (processNumber: string, message: string, gdocsId?: string) => Promise<void>;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isLoading: false,

  addMessage: (msg) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { ...msg, id: crypto.randomUUID(), timestamp: new Date().toISOString() },
      ],
    })),

  sendMessage: async (processNumber, message, gdocsId) => {
    const { addMessage } = get();
    addMessage({ role: "user", content: message });
    set({ isLoading: true });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ processNumber, message, gdocsId }),
      });
      const data = await res.json();
      addMessage({
        role: "assistant",
        content: data.response ?? data.error ?? "Sem resposta",
      });
    } catch {
      addMessage({ role: "system", content: "Erro ao comunicar com o servidor" });
    } finally {
      set({ isLoading: false });
    }
  },

  clearMessages: () => set({ messages: [] }),
}));
