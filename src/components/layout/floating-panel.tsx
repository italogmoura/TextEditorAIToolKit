"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GripHorizontal, Minimize2, Maximize2, X, Pin, PinOff } from "lucide-react";

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
  defaultWidth = 420,
  defaultHeight = 500,
  minWidth = 320,
  minHeight = 300,
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

  // Initialize position on first render
  useEffect(() => {
    if (pos.x === -1) {
      setPos({
        x: window.innerWidth - defaultWidth - 20,
        y: window.innerHeight - defaultHeight - 80,
      });
    }
  }, [pos.x, defaultWidth, defaultHeight]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
    document.body.style.userSelect = "none";
  }, [pos]);

  // Resize handlers
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
      className="fixed z-50 bg-background border rounded-lg shadow-2xl flex flex-col overflow-hidden"
      style={{
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: minimized ? "auto" : size.h,
      }}
    >
      {/* Title bar — draggable */}
      <div
        className="flex items-center justify-between px-2 py-1.5 bg-muted/50 border-b cursor-move shrink-0 select-none"
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-1.5">
          <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold">{title}</span>
        </div>
        <div className="flex items-center gap-0.5">
          {onDock && (
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onDock} title="Fixar na lateral">
              <Pin className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost" size="icon" className="h-5 w-5"
            onClick={() => setMinimized(!minimized)}
            title={minimized ? "Expandir" : "Minimizar"}
          >
            {minimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onClose} title="Fechar">
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {!minimized && (
        <div className="flex-1 overflow-hidden relative">
          {children}
          {/* Resize handle */}
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
            onMouseDown={handleResizeStart}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" className="text-muted-foreground/50">
              <path d="M14 14L8 14L14 8Z" fill="currentColor" />
              <path d="M14 14L11 14L14 11Z" fill="currentColor" opacity="0.5" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
