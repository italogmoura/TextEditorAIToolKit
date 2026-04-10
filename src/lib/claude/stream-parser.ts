/**
 * Parseia chunks de output do Claude Code CLI e emite eventos estruturados.
 */

export interface StreamEvent {
  type: "text" | "tool_use" | "agent_start" | "agent_end" | "ask_user" | "error";
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Buffer que acumula chunks e emite linhas completas.
 */
export class StreamBuffer {
  private buffer = "";
  private onEvent: (event: StreamEvent) => void;

  constructor(onEvent: (event: StreamEvent) => void) {
    this.onEvent = onEvent;
  }

  push(chunk: string) {
    this.buffer += chunk;

    // Emitir linhas completas como eventos de texto
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      this.onEvent(this.parseLine(line));
    }
  }

  flush() {
    if (this.buffer.trim()) {
      this.onEvent(this.parseLine(this.buffer));
      this.buffer = "";
    }
  }

  private parseLine(line: string): StreamEvent {
    // Detectar padrões conhecidos do output do Claude Code
    if (line.includes("[agent:") || line.includes("Agent started")) {
      return { type: "agent_start", content: line };
    }
    if (line.includes("Agent completed") || line.includes("[agent done]")) {
      return { type: "agent_end", content: line };
    }
    if (line.includes("Tool:") || line.includes("[tool_use]")) {
      return { type: "tool_use", content: line };
    }
    if (line.includes("Error:") || line.includes("error:")) {
      return { type: "error", content: line };
    }

    return { type: "text", content: line };
  }
}
