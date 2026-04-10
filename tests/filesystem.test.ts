import { describe, it, expect } from "vitest";
import { listProcesses, getProcessDocuments } from "@/lib/filesystem/processes";

describe("Filesystem: listProcesses", () => {
  it("deve listar processos da pasta test-data", () => {
    const processes = listProcesses();
    expect(processes.length).toBeGreaterThan(0);
    console.log(`  → ${processes.length} processos encontrados`);
  });

  it("cada processo deve ter number e path válidos", () => {
    const processes = listProcesses();
    for (const p of processes) {
      expect(p.number).toBeTruthy();
      expect(p.path).toContain("test-data");
      expect(["novo", "indexado", "elaborando", "revisado", "protocolado"]).toContain(p.status);
    }
  });

  it("deve contar peças e PDFs corretamente", () => {
    const processes = listProcesses();
    const withPecas = processes.filter((p) => p.pecasCount > 0);
    const withPdfs = processes.filter((p) => p.pdfsCount > 0);
    console.log(`  → ${withPecas.length} processos com peças, ${withPdfs.length} com PDFs`);
    expect(withPecas.length).toBeGreaterThan(0);
    expect(withPdfs.length).toBeGreaterThan(0);
  });

  it("deve ordenar por número decrescente", () => {
    const processes = listProcesses();
    for (let i = 1; i < processes.length; i++) {
      expect(processes[i - 1].number >= processes[i].number).toBe(true);
    }
  });
});

describe("Filesystem: getProcessDocuments", () => {
  it("deve listar documentos de um processo existente", () => {
    const processes = listProcesses();
    const firstWithDocs = processes.find((p) => p.pdfsCount > 0 || p.pecasCount > 0);
    expect(firstWithDocs).toBeTruthy();

    const docs = getProcessDocuments(firstWithDocs!.number);
    expect(docs.length).toBeGreaterThan(0);
    console.log(`  → ${docs.length} documentos em ${firstWithDocs!.number}`);
  });

  it("documentos devem ter tipo correto", () => {
    const processes = listProcesses();
    const p = processes.find((p) => p.pecasCount > 0 && p.pdfsCount > 0);
    if (!p) return;

    const docs = getProcessDocuments(p.number);
    const types = new Set(docs.map((d) => d.type));
    console.log(`  → Tipos encontrados: ${[...types].join(", ")}`);
    expect(types.size).toBeGreaterThan(0);

    for (const doc of docs) {
      expect(["peca", "pdf", "index", "notes", "other"]).toContain(doc.type);
      expect(doc.sizeBytes).toBeGreaterThan(0);
      expect(doc.name).toBeTruthy();
      expect(doc.path).toBeTruthy();
    }
  });

  it("deve retornar array vazio para processo inexistente", () => {
    const docs = getProcessDocuments("999999-INEXISTENTE");
    expect(docs).toEqual([]);
  });

  it("PDFs devem ter extensão .PDF ou .pdf", () => {
    const processes = listProcesses();
    const p = processes.find((p) => p.pdfsCount > 0);
    if (!p) return;

    const docs = getProcessDocuments(p.number);
    const pdfs = docs.filter((d) => d.type === "pdf");
    for (const pdf of pdfs) {
      expect(pdf.name.toLowerCase()).toMatch(/\.pdf$/);
    }
  });
});
