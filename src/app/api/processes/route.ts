import { NextRequest, NextResponse } from "next/server";
import { listProcesses } from "@/lib/filesystem/processes";
import { logAudit } from "@/lib/db/audit";
import fs from "fs";
import path from "path";
import { getClaudeDocsPath } from "@/lib/config";

const CLAUDE_DOCS_PATH = getClaudeDocsPath();

export async function GET() {
  const processes = listProcesses();
  return NextResponse.json(processes);
}

// POST: Create a new process
export async function POST(request: NextRequest) {
  const { processNumber } = await request.json();

  if (!processNumber) {
    return NextResponse.json({ error: "processNumber é obrigatório" }, { status: 400 });
  }

  const processDir = path.join(CLAUDE_DOCS_PATH, "processos", processNumber);

  if (fs.existsSync(processDir)) {
    return NextResponse.json({ error: "Processo já existe" }, { status: 409 });
  }

  try {
    // Create directory structure
    fs.mkdirSync(path.join(processDir, "docs"), { recursive: true });
    fs.mkdirSync(path.join(processDir, "pecas"), { recursive: true });

    // Create empty notas.md
    fs.writeFileSync(path.join(processDir, "notas.md"), `# Notas — ${processNumber}\n\n`);

    await logAudit({
      processNumber,
      action: "process:create",
      entityType: "process",
    });

    return NextResponse.json({
      success: true,
      processNumber,
      path: processDir,
    });
  } catch (error) {
    return NextResponse.json({ error: `Erro ao criar processo: ${error}` }, { status: 500 });
  }
}
