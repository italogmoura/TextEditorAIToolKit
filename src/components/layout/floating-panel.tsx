"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GripHorizontal, Minimize2, Maximize2, X, Pin } from "lucide-react";

interface FloatingPanelProps {
  children: React.ReactNode;
  title?: string;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
  onClose?: () => void;
  onDock?: () => void;
  isVisible: boolean;
}

export function FloatingPanel({
  children,
  title = "AI Panel",
  defaultWidth = 400,
  defaultHeight = 480,
  minWidth = 300,
  minHeight = 250,
  onClose,
  onDock,
  isVisible,
}: FloatingPanelProps) {
  const [pos, setPos] = useState({ x: -1, y: -1 });
  const [size, setSize] = useState({ w: defaultWidth, h: defaultHeight });
  const [minimized, setMinimized] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (pos.x === -1) {
      setPos({
        x: window.innerWidth - defaultWidth - 24,
        y: window.innerHeight - defaultHeight - 60,
      });
    }
  }, [pos.x, defaultWidth, defaultHeight]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    document.body.style.userSelect = "none";
  }, [pos]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    isResizing.current = true;
    dragOffset.current = { x: e.clientX, y: e.clientY };
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (isDragging.current) {
        setPos({
          x: Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.current.x)),
          y: Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffset.current.y)),
        });
      }
      if (isResizing.current) {
        const dx = e.clientX - dragOffset.current.x;
        const dy = e.clientY - dragOffset.current.y;
        setSize((prev) => ({
          w: Math.max(minWidth, prev.w + dx),
          h: Math.max(minHeight, prev.h + dy),
        }));
        dragOffset.current = { x: e.clientX, y: e.clientY };
      }
    }
    function handleMouseUp() {
      isDragging.current = false;
      isResizing.current = false;
      document.body.style.userSelect = "";
    }
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [minWidth, minHeight]);

  if (!isVisible) return null;

  return (
    <div
      ref={panelRef}
      className="fixed z-50 flex flex-col overflow-hidden"
      style={{
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: minimized ? "auto" : size.h,
        borderRadius: "16px",
        background: "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.12), 0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.06)",
      }}
    >
      {/* Title bar — Tiptap style: clean, minimal grip */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-move shrink-0 select-none"
        onMouseDown={handleDragStart}
        style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
      >
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            <div className="w-1 h-1 rounded-full bg-zinc-300" />
            <div className="w-1 h-1 rounded-full bg-zinc-300" />
            <div className="w-1 h-1 rounded-full bg-zinc-300" />
          </div>
          <span className="text-[11px] font-medium text-zinc-600">{title}</span>
        </div>
        <div className="flex items-center gap-0.5">
          {onDock && (
            <button
              className="h-6 w-6 rounded-md flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
              onClick={(e) => { e.stopPropagation(); onDock(); }}
              title="Fixar na lateral"
            >
              <Pin className="h-3 w-3" />
            </button>
          )}
          <button
            className="h-6 w-6 rounded-md flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
            onClick={(e) => { e.stopPropagation(); setMinimized(!minimized); }}
            title={minimized ? "Expandir" : "Minimizar"}
          >
            {minimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          </button>
          {onClose && (
            <button
              className="h-6 w-6 rounded-md flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              title="Fechar"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {!minimized && (
        <div className="flex-1 overflow-hidden relative">
          {children}
          {/* Resize grip — bottom right corner */}
          <div
            className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize flex items-end justify-end p-0.5 opacity-30 hover:opacity-60 transition-opacity"
            onMouseDown={handleResizeStart}
          >
            <svg width="12" height="12" viewBox="0 0 12 12">
              <circle cx="9.5" cy="9.5" r="1" fill="#999" />
              <circle cx="5.5" cy="9.5" r="1" fill="#999" />
              <circle cx="9.5" cy="5.5" r="1" fill="#999" />
              <circle cx="1.5" cy="9.5" r="1" fill="#999" />
              <circle cx="9.5" cy="1.5" r="1" fill="#999" />
              <circle cx="5.5" cy="5.5" r="1" fill="#999" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
