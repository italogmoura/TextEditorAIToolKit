import { describe, it, expect } from "vitest";
import {
  createDocument,
  getDocumentContent,
  getDocumentAsAnnotatedText,
  insertTextAtEnd,
  exportAsDocx,
  uploadDocxAsGoogleDoc,
  createOrGetFolder,
  lockDocument,
  unlockDocument,
  isDocumentLocked,
} from "@/lib/gdocs/client";
import fs from "fs";
import path from "path";

// These tests hit the real Google Docs API — run sparingly
describe("Google Docs API", () => {
  let testDocId: string;

  it("deve criar um documento vazio", async () => {
    testDocId = await createDocument("TEST — Smoke Test " + Date.now());
    expect(testDocId).toBeTruthy();
    expect(testDocId.length).toBeGreaterThan(10);
    console.log(`  → Doc criado: ${testDocId}`);
  });

  it("deve inserir texto no documento", async () => {
    expect(testDocId).toBeTruthy();
    await insertTextAtEnd(testDocId, "MINISTÉRIO PÚBLICO FEDERAL\n\nPARECER\n\nTeste de integração.");
    console.log("  → Texto inserido");
  });

  it("deve ler conteúdo estruturado", async () => {
    expect(testDocId).toBeTruthy();
    const doc = await getDocumentContent(testDocId);
    expect(doc.body).toBeTruthy();
    expect(doc.body!.content!.length).toBeGreaterThan(0);
    console.log(`  → ${doc.body!.content!.length} elementos no documento`);
  });

  it("deve gerar texto anotado com índices", async () => {
    expect(testDocId).toBeTruthy();
    const text = await getDocumentAsAnnotatedText(testDocId);
    expect(text).toContain("§");
    expect(text).toContain("idx:");
    expect(text).toContain("MINISTÉRIO PÚBLICO FEDERAL");
    console.log(`  → Texto anotado: ${text.substring(0, 100)}...`);
  });

  it("deve fazer lock/unlock in-memory", () => {
    lockDocument("test-id");
    expect(isDocumentLocked("test-id")).toBe(true);
    unlockDocument("test-id");
    expect(isDocumentLocked("test-id")).toBe(false);
  });

  it("deve exportar como .docx", async () => {
    expect(testDocId).toBeTruthy();
    const exportDir = path.join(process.cwd(), "data", "exports");
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

    const outputPath = path.join(exportDir, `test-smoke-${Date.now()}.docx`);
    await exportAsDocx(testDocId, outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
    const stat = fs.statSync(outputPath);
    expect(stat.size).toBeGreaterThan(0);
    console.log(`  → Exportado: ${outputPath} (${stat.size} bytes)`);

    // Cleanup
    fs.unlinkSync(outputPath);
  });

  it("deve criar pasta no Drive", async () => {
    const folderId = await createOrGetFolder("TEST-Smoke-" + Date.now());
    expect(folderId).toBeTruthy();
    console.log(`  → Pasta criada: ${folderId}`);
  });

  it("deve fazer upload de .docx com conversão", async () => {
    // Find a .docx in test-data
    const testDataDir = path.join(process.cwd(), "test-data");
    let docxPath: string | null = null;

    const dirs = fs.readdirSync(testDataDir);
    for (const dir of dirs) {
      const pecasDir = path.join(testDataDir, dir, "pecas");
      if (!fs.existsSync(pecasDir)) continue;
      const files = fs.readdirSync(pecasDir).filter((f) => f.endsWith(".docx"));
      if (files.length > 0) {
        docxPath = path.join(pecasDir, files[0]);
        break;
      }
    }

    if (!docxPath) {
      console.log("  → Nenhum .docx encontrado em test-data, pulando");
      return;
    }

    console.log(`  → Uploading: ${path.basename(docxPath)}`);
    const docId = await uploadDocxAsGoogleDoc(docxPath, "TEST — Upload " + Date.now());
    expect(docId).toBeTruthy();

    // Verify content was converted
    const text = await getDocumentAsAnnotatedText(docId);
    expect(text.length).toBeGreaterThan(0);
    console.log(`  → Upload OK: ${docId}, ${text.length} chars de conteúdo`);
  });
});
