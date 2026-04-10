"use client";

import { Cloud, CloudOff, Lock } from "lucide-react";

export function GDocsStatus({
  isLocked,
  isConnected,
}: {
  isLocked: boolean;
  isConnected: boolean;
}) {
  if (isLocked) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-500">
        <Lock className="h-3 w-3" />
        <span>IA editando</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 text-xs ${isConnected ? "text-green-500" : "text-muted-foreground"}`}>
      {isConnected ? <Cloud className="h-3 w-3" /> : <CloudOff className="h-3 w-3" />}
      <span>{isConnected ? "Sincronizado" : "Offline"}</span>
    </div>
  );
}
