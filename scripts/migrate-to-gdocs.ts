#!/usr/bin/env tsx
/**
 * Migração em lote: .md → Google Docs
 *
 * Para cada processo em processos/:
 *   Para cada .md em pecas/:
 *     1. Lê conteúdo do .md
 *     2. Cria Google Doc com título "{processo} — {nome}"
 *     3. Insere conteúdo via Google Docs API
 *     4. Registra gdocsId em .gdocs-meta.json
 *     5. Renomeia .md para .md.migrated
 *
 * Uso: pnpm tsx scripts/migrate-to-gdocs.ts [--dry-run]
 */

import fs from "fs";
import path from "path";
import { createDocument, insertTextAtEnd, createOrGetFolder } from "../src/lib/gdocs/client";

const CLAUDE_DOCS_PATH = process.env.CLAUDE_DOCS_PATH ?? "/Users/italo/Library/Mobile Documents/com~apple~CloudDocs/ClaudeDocs";
const PROCESSOS_DIR = path.join(CLAUDE_DOCS_PATH, "processos");
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  console.log("🔄 Migração .md → Google Docs");
  console.log(`   Fonte: ${PROCESSOS_DIR}`);
  console.log(`   Modo: ${DRY_RUN ? "DRY RUN (sem alterações)" : "PRODUÇÃO"}`);
  console.log("");

  if (!fs.existsSync(PROCESSOS_DIR)) {
    console.error("❌ Pasta de processos não encontrada");
    process.exit(1);
  }

  // Create folder structure
  let mpfFolder: string | undefined;
  let textEditorFolder: string | undefined;

  if (!DRY_RUN) {
    mpfFolder = await createOrGetFolder("MPF");
    textEditorFolder = await createOrGetFolder("TextEditor", mpfFolder);
  }

  const processDirs = fs.readdirSync(PROCESSOS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."));

  let totalMigrated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const processDir of processDirs) {
    const processNumber = processDir.name;
    const pecasDir = path.join(PROCESSOS_DIR, processNumber, "pecas");

    if (!fs.existsSync(pecasDir)) continue;

    const mdFiles = fs.readdirSync(pecasDir)
      .filter((f) => f.endsWith(".md") && !f.endsWith(".migrated.md") && !f.startsWith("."));

    if (mdFiles.length === 0) continue;

    console.log(`📂 ${processNumber} — ${mdFiles.length} arquivo(s) .md`);

    // Load or create metadata
    const metaPath = path.join(PROCESSOS_DIR, processNumber, ".gdocs-meta.json");
    let meta: Record<string, { gdocsId: string; gdocsRevisionId: string; lastSyncedAt: string; status: string }> = {};
    if (fs.existsSync(metaPath)) {
      meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    }

    // Create process folder in Google Drive
    let processFolder: string | undefined;
    if (!DRY_RUN && textEditorFolder) {
      processFolder = await createOrGetFolder(processNumber, textEditorFolder);
    }

    for (const mdFile of mdFiles) {
      const docName = mdFile.replace(/\.md$/, "");

      // Skip if already migrated
      if (meta[docName]?.gdocsId) {
        console.log(`   ⏭  ${mdFile} — já migrado (${meta[docName].gdocsId})`);
        totalSkipped++;
        continue;
      }

      const mdPath = path.join(pecasDir, mdFile);
      const content = fs.readFileSync(mdPath, "utf-8");

      if (DRY_RUN) {
        console.log(`   📝 ${mdFile} — seria migrado (${content.length} chars)`);
        totalMigrated++;
        continue;
      }

      try {
        // Create Google Doc
        const title = `${processNumber} — ${docName}`;
        const docId = await createDocument(title, processFolder);

        // Insert content
        if (content.trim()) {
          await insertTextAtEnd(docId, content);
        }

        // Update metadata
        meta[docName] = {
          gdocsId: docId,
          gdocsRevisionId: "1",
          lastSyncedAt: new Date().toISOString(),
          status: "active",
        };

        // Rename .md to .md.migrated
        fs.renameSync(mdPath, `${mdPath}.migrated`);

        console.log(`   ✅ ${mdFile} → ${docId}`);
        totalMigrated++;

        // Rate limit: wait 500ms between documents
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`   ❌ ${mdFile} — erro: ${error}`);
        totalErrors++;
      }
    }

    // Save metadata
    if (!DRY_RUN) {
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    }
  }

  console.log("");
  console.log("📊 Resumo:");
  console.log(`   Migrados: ${totalMigrated}`);
  console.log(`   Ignorados: ${totalSkipped}`);
  console.log(`   Erros: ${totalErrors}`);
}

main().catch(console.error);
