"use client";

import { useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold, Italic, Underline as UnderlineIcon, Heading1, Heading2, Heading3,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Undo2, Redo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveLocalEdits } from "@/lib/offline/document-cache";

interface LocalEditorProps {
  gdocsId: string;
  initialHtml: string;
  initialTiptapJson?: string | null;
  isOnline: boolean;
  syncStatus: "synced" | "syncing" | "pending" | "conflict" | "error";
  onContentChange?: (html: string, json: string) => void;
}

export function LocalEditor({
  gdocsId,
  initialHtml,
  initialTiptapJson,
  isOnline,
  syncStatus,
  onContentChange,
}: LocalEditorProps) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: initialTiptapJson ? JSON.parse(initialTiptapJson) : initialHtml,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-full px-4 py-4",
        style: [
          "font-family: 'Times New Roman', Times, serif",
          "font-size: 12pt",
          "line-height: 1.5",
          "text-align: justify",
        ].join(";"),
      },
    },
    onUpdate: ({ editor }) => {
      // Debounce de 2s para salvar no IndexedDB
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const json = JSON.stringify(editor.getJSON());
        const html = editor.getHTML();
        if (json !== lastSavedRef.current) {
          lastSavedRef.current = json;
          saveLocalEdits(gdocsId, json, html);
          onContentChange?.(html, json);
        }
      }, 2000);
    },
  });

  // Cleanup timer ao desmontar
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Flush final ao desmontar (salvar edições pendentes)
  useEffect(() => {
    return () => {
      if (editor) {
        const json = JSON.stringify(editor.getJSON());
        const html = editor.getHTML();
        if (json !== lastSavedRef.current) {
          saveLocalEdits(gdocsId, json, html);
        }
      }
    };
  }, [editor, gdocsId]);

  const ToolbarButton = useCallback(({
    onClick,
    isActive,
    children,
    title
  }: {
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <Button
      variant="ghost"
      size="icon"
      className={`h-7 w-7 ${isActive ? "bg-accent text-accent-foreground" : ""}`}
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  ), []);

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Banner offline */}
      {!isOnline && (
        <div className="px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-600 text-xs flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          Modo offline — alterações serão sincronizadas quando a conexão voltar
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-b bg-muted/30 shrink-0 flex-wrap">
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          title="Desfazer"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          title="Refazer"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="Negrito"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="Itálico"
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          title="Sublinhado"
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive("heading", { level: 1 })}
          title="Título 1"
        >
          <Heading1 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
          title="Título 2"
        >
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive("heading", { level: 3 })}
          title="Título 3"
        >
          <Heading3 className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          isActive={editor.isActive({ textAlign: "left" })}
          title="Alinhar à esquerda"
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          isActive={editor.isActive({ textAlign: "center" })}
          title="Centralizar"
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          isActive={editor.isActive({ textAlign: "right" })}
          title="Alinhar à direita"
        >
          <AlignRight className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          isActive={editor.isActive({ textAlign: "justify" })}
          title="Justificar"
        >
          <AlignJustify className="h-3.5 w-3.5" />
        </ToolbarButton>

      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-auto bg-white">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}
