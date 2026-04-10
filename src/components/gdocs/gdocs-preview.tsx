"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GDocsPreview({
  gdocsId,
  title,
}: {
  gdocsId: string;
  title?: string;
}) {
  const previewUrl = `https://docs.google.com/document/d/${gdocsId}/preview`;
  const editUrl = `https://docs.google.com/document/d/${gdocsId}/edit`;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <span className="text-xs font-medium truncate">{title ?? "Google Docs"}</span>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-xs gap-1"
          onClick={() => window.open(editUrl, "_blank")}
        >
          <ExternalLink className="h-3 w-3" />
          Editar no Google Docs
        </Button>
      </div>
      <iframe
        src={previewUrl}
        className="flex-1 w-full border-0"
        title="Google Docs Preview"
      />
    </div>
  );
}
