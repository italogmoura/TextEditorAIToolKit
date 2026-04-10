import { describe, it, expect } from "vitest";
import { buildPromptContext, assemblePrompt } from "@/lib/claude/prompt-builder";
import { listProcesses } from "@/lib/filesystem/processes";

describe("PromptBuilder: buildPromptContext", () => {
  it("deve montar contexto para um processo existente", async () => {
    const processes = await listProcesses();
    const p = processes[0];
    expect(p).toBeTruthy();

    const context = await buildPromptContext({
      processNumber: p.number,
    });

    // Sem CLAUDE.md na test-data-root (é esperado estar vazio)
    expect(context).toBeTruthy();
    expect(typeof context.processContext).toBe("string");
    console.log(`  → Contexto montado para ${p.number}: ${context.processContext.length} chars`);
  });

  it("deve incluir índice se existir", async () => {
    const processes = await listProcesses();
    const p = processes.find((p) => p.hasIndex);
    if (!p) {
      console.log("  → Nenhum processo com índice no test-data, pulando");
      return;
    }

    const context = await buildPromptContext({
      processNumber: p.number,
    });

    expect(context.processContext).toContain("Índice dos Autos");
    console.log(`  → Índice incluído para ${p.number}`);
  });
});

describe("PromptBuilder: assemblePrompt", () => {
  it("deve montar prompt com contexto e mensagem", () => {
    const context = {
      systemPrompt: "Você é uma Procuradora...",
      processContext: "## Índice\n\nEvento 1 — Petição inicial",
    };

    const prompt = assemblePrompt(context, "Resuma o caso");

    expect(prompt).toContain("contexto_do_processo");
    expect(prompt).toContain("Índice");
    expect(prompt).toContain("Resuma o caso");
  });

  it("deve funcionar sem contexto", () => {
    const context = { systemPrompt: "", processContext: "" };
    const prompt = assemblePrompt(context, "Olá");
    expect(prompt).toBe("Olá");
  });
});
