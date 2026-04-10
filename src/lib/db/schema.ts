import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  processNumber: text("process_number").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>().default({}),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});

export const agentRuns = sqliteTable("agent_runs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  processNumber: text("process_number").notNull(),
  agentName: text("agent_name").notNull(),
  workflowName: text("workflow_name"),
  workflowRunId: text("workflow_run_id"),
  documentName: text("document_name").notNull(),
  status: text("status").default("pending"),
  model: text("model"),
  inputSummary: text("input_summary"),
  outputSummary: text("output_summary"),
  outputFull: text("output_full", { mode: "json" }).$type<Record<string, unknown>>(),
  findings: text("findings", { mode: "json" }).$type<Array<Record<string, unknown>>>().default([]),
  durationMs: integer("duration_ms"),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});

export const documentVersions = sqliteTable("document_versions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  processNumber: text("process_number").notNull(),
  documentName: text("document_name").notNull(),
  gdocsId: text("gdocs_id"),
  gdocsRevisionId: text("gdocs_revision_id"),
  status: text("status").notNull(),
  reviewRunId: text("review_run_id"),
  notes: text("notes"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});
