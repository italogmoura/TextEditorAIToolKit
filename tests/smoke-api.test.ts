import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "http";
import next from "next";
import type { AddressInfo } from "net";

// Smoke tests that boot the actual Next.js server and hit API routes
describe("Smoke: API Routes", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = next({ dev: false, dir: process.cwd() });
    await app.prepare();
    const handle = app.getRequestHandler();

    server = createServer({ maxHeaderSize: 65536 }, (req, res) => {
      handle(req, res);
    });

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });
  }, 60000);

  afterAll(async () => {
    if (server) server.close();
  });

  it("GET /api/processes deve retornar lista", async () => {
    const res = await fetch(`${baseUrl}/api/processes`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    console.log(`  → ${data.length} processos`);

    // Verificar estrutura
    const first = data[0];
    expect(first.number).toBeTruthy();
    expect(first.path).toBeTruthy();
    expect(typeof first.pecasCount).toBe("number");
    expect(typeof first.pdfsCount).toBe("number");
  });

  it("GET /api/processes/[id] deve retornar documentos", async () => {
    const listRes = await fetch(`${baseUrl}/api/processes`);
    const processes = await listRes.json();
    const p = processes.find((p: { pecasCount: number }) => p.pecasCount > 0);
    if (!p) return;

    const res = await fetch(`${baseUrl}/api/processes/${encodeURIComponent(p.number)}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.processNumber).toBe(p.number);
    expect(data.documents.length).toBeGreaterThan(0);
    console.log(`  → ${data.documents.length} documentos em ${p.number}`);
  });

  it("GET /api/processes/INEXISTENTE deve retornar docs vazio", async () => {
    const res = await fetch(`${baseUrl}/api/processes/INEXISTENTE`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.documents).toEqual([]);
  });

  it("GET /api/pdf deve servir PDF existente", async () => {
    const listRes = await fetch(`${baseUrl}/api/processes`);
    const processes = await listRes.json();
    const p = processes.find((p: { pdfsCount: number }) => p.pdfsCount > 0);
    if (!p) return;

    const docsRes = await fetch(`${baseUrl}/api/processes/${encodeURIComponent(p.number)}`);
    const docsData = await docsRes.json();
    const pdf = docsData.documents.find((d: { type: string }) => d.type === "pdf");
    if (!pdf) return;

    const res = await fetch(`${baseUrl}/api/pdf?path=${encodeURIComponent(pdf.path)}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    console.log(`  → PDF servido: ${pdf.name}`);
  });

  it("GET /api/pdf sem path deve retornar 400", async () => {
    const res = await fetch(`${baseUrl}/api/pdf`);
    expect(res.status).toBe(400);
  });

  it("GET /api/pdf com path fora de processos deve retornar 403", async () => {
    const res = await fetch(`${baseUrl}/api/pdf?path=/etc/passwd`);
    expect(res.status).toBe(403);
  });

  it("GET /api/file deve servir .md existente", async () => {
    const listRes = await fetch(`${baseUrl}/api/processes`);
    const processes = await listRes.json();
    const p = processes.find((pp: { pecasCount: number }) => pp.pecasCount > 0);
    if (!p) return;

    const docsRes = await fetch(`${baseUrl}/api/processes/${encodeURIComponent(p.number)}`);
    const docsData = await docsRes.json();
    const md = docsData.documents.find((d: { name: string }) => d.name.endsWith(".md"));
    if (!md) return;

    const res = await fetch(`${baseUrl}/api/file?path=${encodeURIComponent(md.path)}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.content).toBeTruthy();
    expect(data.fileName).toBe(md.name);
    console.log(`  → Arquivo servido: ${md.name} (${data.content.length} chars)`);
  });

  it("POST /api/processes deve criar processo novo", async () => {
    const testNumber = `TEST-SMOKE-${Date.now()}`;
    const res = await fetch(`${baseUrl}/api/processes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ processNumber: testNumber }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.processNumber).toBe(testNumber);
    console.log(`  → Processo criado: ${testNumber}`);

    // Cleanup
    const fs = await import("fs");
    fs.rmSync(data.path, { recursive: true, force: true });
  });

  it("POST /api/processes duplicado deve retornar 409", async () => {
    const listRes = await fetch(`${baseUrl}/api/processes`);
    const processes = await listRes.json();
    if (processes.length === 0) return;

    const res = await fetch(`${baseUrl}/api/processes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ processNumber: processes[0].number }),
    });
    expect(res.status).toBe(409);
  });

  it("GET /api/history/[processNumber] deve retornar histórico", async () => {
    const res = await fetch(`${baseUrl}/api/history/TEST-001`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.logs)).toBe(true);
    expect(Array.isArray(data.runs)).toBe(true);
  });
});
