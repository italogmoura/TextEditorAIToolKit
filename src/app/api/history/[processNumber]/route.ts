import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { auditLogs, agentRuns } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ processNumber: string }> }
) {
  const { processNumber } = await params;

  const logs = db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.processNumber, processNumber))
    .orderBy(desc(auditLogs.createdAt))
    .limit(100)
    .all();

  const runs = db
    .select()
    .from(agentRuns)
    .where(eq(agentRuns.processNumber, processNumber))
    .orderBy(desc(agentRuns.createdAt))
    .limit(50)
    .all();

  return NextResponse.json({ logs, runs });
}
