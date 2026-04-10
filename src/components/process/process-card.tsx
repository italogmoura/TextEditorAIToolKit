"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, FolderOpen } from "lucide-react";
import type { ProcessInfo } from "@/lib/types/process";

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  novo: { label: "Novo", variant: "destructive" },
  indexado: { label: "Indexado", variant: "secondary" },
  elaborando: { label: "Em elaboração", variant: "default" },
  revisado: { label: "Revisado", variant: "outline" },
  protocolado: { label: "Protocolado", variant: "outline" },
};

export function ProcessCard({ process }: { process: ProcessInfo }) {
  const statusConfig = STATUS_CONFIG[process.status] ?? STATUS_CONFIG.novo;

  return (
    <Link href={`/processo/${encodeURIComponent(process.number)}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-mono truncate">
              {process.number}
            </CardTitle>
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {process.pecasCount} peça{process.pecasCount !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <FolderOpen className="h-3 w-3" />
              {process.pdfsCount} PDF{process.pdfsCount !== 1 ? "s" : ""}
            </span>
            {process.hasIndex && (
              <Badge variant="outline" className="text-xs h-5">
                Indexado
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
