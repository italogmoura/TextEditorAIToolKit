"use client";

import { useState, useCallback } from "react";

export function useGDocs() {
  const [isCreating, setIsCreating] = useState(false);

  const createDocument = useCallback(
    async (processNumber: string, documentName: string, title?: string) => {
      setIsCreating(true);
      try {
        const res = await fetch("/api/gdocs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ processNumber, documentName, title }),
        });
        return await res.json();
      } finally {
        setIsCreating(false);
      }
    },
    []
  );

  const getDocumentText = useCallback(async (docId: string) => {
    const res = await fetch(`/api/gdocs?docId=${docId}`);
    return await res.json();
  }, []);

  const exportDocument = useCallback(
    async (processNumber: string, documentName: string, gdocsId: string) => {
      const res = await fetch("/api/gdocs/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ processNumber, documentName, gdocsId }),
      });
      return await res.json();
    },
    []
  );

  const openInGoogleDocs = useCallback((gdocsId: string) => {
    window.open(`https://docs.google.com/document/d/${gdocsId}/edit`, "_blank");
  }, []);

  return { isCreating, createDocument, getDocumentText, exportDocument, openInGoogleDocs };
}
