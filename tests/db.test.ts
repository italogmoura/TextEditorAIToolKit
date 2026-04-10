import { describe, it, expect } from "vitest";
import { db } from "@/lib/db/client";
import { auditLogs, agentRuns } from "@/lib/db/schema";
import { logAudit } from "@/lib/db/audit";

describe("Database: SQLite + Drizzle", () => {
  it("deve conectar ao banco", () => {
    expect(db).toBeTruthy();
  });

  it("deve inserir um audit log", async () => {
    await logAudit({
      processNumber: "TEST-001",
      action: "test:smoke",
      entityType: "test",
      entityId: "smoke-test",
      metadata: { timestamp: Date.now() },
    });

    const logs = db.select().from(auditLogs).all();
    const testLog = logs.find((l) => l.processNumber === "TEST-001");
    expect(testLog).toBeTruthy();
    expect(testLog!.action).toBe("test:smoke");
  });

  it("deve inserir e consultar agent_runs", async () => {
    await db.insert(agentRuns).values({
      processNumber: "TEST-001",
      agentName: "test-agent",
      documentName: "test-doc",
      status: "completed",
      outputSummary: "Test output",
      durationMs: 1234,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });

    const runs = db.select().from(agentRuns).all();
    const testRun = runs.find((r) => r.agentName === "test-agent");
    expect(testRun).toBeTruthy();
    expect(testRun!.durationMs).toBe(1234);
  });
});
