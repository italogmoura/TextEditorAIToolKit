"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft, Save, CheckCircle, XCircle, FolderOpen, AlertTriangle,
} from "lucide-react";
import Link from "next/link";

interface AppConfig {
  claudeDocsPath: string;
  googleSharedEmails: string[];
  googleServiceAccountKeyPath: string;
  gdrivePeticionamentoPath: string;
}

interface Validation {
  claudeDocsPathExists: boolean;
  processosExists: boolean;
  claudeMdExists: boolean;
  agentsExist: boolean;
  scriptsExist: boolean;
  keyFileExists: boolean;
  gdriveExists: boolean | null;
}

function StatusIcon({ ok }: { ok: boolean | null }) {
  if (ok === null) return <AlertTriangle className="h-3.5 w-3.5 text-zinc-300" />;
  return ok
    ? <CheckCircle className="h-3.5 w-3.5 text-green-500" />
    : <XCircle className="h-3.5 w-3.5 text-red-500" />;
}

export default function ConfigPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [validation, setValidation] = useState<Validation | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => {
        setConfig(d.config);
        setValidation(d.validation);
      });
  }, []);

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    const data = await res.json();
    if (data.success) {
      setSaved(true);
      // Reload validation
      const v = await fetch("/api/config").then((r) => r.json());
      setValidation(v.validation);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  if (!config) {
    return (
      <div className="flex flex-col h-screen">
        <Header />
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Carregando...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <Header>
        <div className="flex items-center gap-2 flex-1 mx-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <ArrowLeft className="h-3 w-3" />
            </Button>
          </Link>
          <span className="text-xs font-semibold">Configurações</span>
        </div>
      </Header>

      <ScrollArea className="flex-1">
        <div className="max-w-2xl mx-auto p-6 space-y-6">

          {/* Workspace Path */}
          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Pasta do Workspace (ClaudeDocs)
            </label>
            <p className="text-xs text-muted-foreground">
              Pasta raiz que contém CLAUDE.md, processos/, scripts/, .claude/agents/, etc.
            </p>
            <input
              type="text"
              value={config.claudeDocsPath}
              onChange={(e) => setConfig({ ...config, claudeDocsPath: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
              placeholder="/Users/seu-usuario/ClaudeDocs"
            />
            {validation && (
              <div className="grid grid-cols-2 gap-1 text-xs mt-2">
                <div className="flex items-center gap-1.5">
                  <StatusIcon ok={validation.claudeDocsPathExists} />
                  <span>Pasta existe</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusIcon ok={validation.processosExists} />
                  <span>processos/ encontrado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusIcon ok={validation.claudeMdExists} />
                  <span>CLAUDE.md encontrado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusIcon ok={validation.agentsExist} />
                  <span>.claude/agents/ encontrado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusIcon ok={validation.scriptsExist} />
                  <span>scripts/ encontrado</span>
                </div>
              </div>
            )}
          </div>

          {/* Google Shared Emails */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">Emails para compartilhamento (Google Docs)</label>
            <p className="text-xs text-muted-foreground">
              Documentos criados no Google Docs serão compartilhados com estes emails. Um por linha.
            </p>
            <textarea
              value={config.googleSharedEmails.join("\n")}
              onChange={(e) =>
                setConfig({
                  ...config,
                  googleSharedEmails: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                })
              }
              className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
              rows={3}
              placeholder="email@exemplo.com"
            />
          </div>

          {/* Google Service Account Key */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">Chave da Conta de Serviço Google</label>
            <p className="text-xs text-muted-foreground">
              Caminho para o arquivo JSON da service account do Google Cloud.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={config.googleServiceAccountKeyPath}
                onChange={(e) => setConfig({ ...config, googleServiceAccountKeyPath: e.target.value })}
                className="flex-1 px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
              />
              {validation && (
                <div className="flex items-center">
                  <StatusIcon ok={validation.keyFileExists} />
                </div>
              )}
            </div>
          </div>

          {/* Google Drive Peticionamento Path */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">Pasta de Peticionamento (Google Drive)</label>
            <p className="text-xs text-muted-foreground">
              Pasta onde os .docx exportados são salvos. Deixe vazio para salvar em data/exports/.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={config.gdrivePeticionamentoPath}
                onChange={(e) => setConfig({ ...config, gdrivePeticionamentoPath: e.target.value })}
                className="flex-1 px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                placeholder="(opcional)"
              />
              {validation && config.gdrivePeticionamentoPath && (
                <div className="flex items-center">
                  <StatusIcon ok={validation.gdriveExists} />
                </div>
              )}
            </div>
          </div>

          {/* Save button */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : "Salvar Configurações"}
            </Button>
            {saved && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Salvo! Reinicie o servidor para aplicar.
              </span>
            )}
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}
