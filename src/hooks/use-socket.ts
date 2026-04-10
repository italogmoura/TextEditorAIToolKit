"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [terminalLines, setTerminalLines] = useState<
    Array<{ timestamp: string; agent?: string; text: string; type: "info" | "error" | "tool" }>
  >([]);

  useEffect(() => {
    const socket = io({ path: "/socket.io" });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    // Terminal events
    socket.on("agent:chunk", (data: { agentName: string; text: string }) => {
      setTerminalLines((prev) => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          agent: data.agentName,
          text: data.text,
          type: "info",
        },
      ]);
    });

    socket.on("agent:error", (data: { agentName: string; error: string }) => {
      setTerminalLines((prev) => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          agent: data.agentName,
          text: data.error,
          type: "error",
        },
      ]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  function clearTerminal() {
    setTerminalLines([]);
  }

  return { socket: socketRef.current, connected, terminalLines, clearTerminal };
}
