"use client";

import { Cloud, CloudOff, Lock, Monitor, RefreshCw } from "lucide-react";

export type EditorModeDisplay = "gdocs" | "local";

export function GDocsStatus({
  isLocked,
  isConnected,
  editorMode,
}: {
  isLocked: boolean;
  isConnected: boolean;
  editorMode?: EditorModeDisplay;
}) {
  if (isLocked) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-500">
        <Lock className="h-3 w-3" />
        <span>IA editando</span>
      </div>
    );
  }

  if (editorMode === "local" && isConnected) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-blue-500">
        <Monitor className="h-3 w-3" />
        <span>Editor local</span>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-500">
        <CloudOff className="h-3 w-3" />
        <span>Offline</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-green-500">
      <Cloud className="h-3 w-3" />
      <span>Sincronizado</span>
    </div>
  );
}
