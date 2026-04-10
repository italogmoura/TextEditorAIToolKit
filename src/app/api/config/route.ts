import { NextRequest, NextResponse } from "next/server";
import { loadConfig, saveConfig } from "@/lib/config";
import fs from "fs";

export async function GET() {
  const config = loadConfig();

  // Validate paths
  const validation = {
    claudeDocsPathExists: fs.existsSync(config.claudeDocsPath),
    processosExists: fs.existsSync(`${config.claudeDocsPath}/processos`),
    claudeMdExists: fs.existsSync(`${config.claudeDocsPath}/CLAUDE.md`),
    agentsExist: fs.existsSync(`${config.claudeDocsPath}/.claude/agents`),
    scriptsExist: fs.existsSync(`${config.claudeDocsPath}/scripts`),
    keyFileExists: fs.existsSync(config.googleServiceAccountKeyPath),
    gdriveExists: config.gdrivePeticionamentoPath ? fs.existsSync(config.gdrivePeticionamentoPath) : null,
  };

  return NextResponse.json({ config, validation });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    const saved = saveConfig(body);
    return NextResponse.json({ success: true, config: saved });
  } catch (error) {
    return NextResponse.json({ error: `${error}` }, { status: 500 });
  }
}
