import fs from "fs";
import path from "path";

const CONFIG_PATH = path.join(process.cwd(), "data", "config.json");

export interface AppConfig {
  claudeDocsPath: string;
  googleSharedEmails: string[];
  googleServiceAccountKeyPath: string;
  gdrivePeticionamentoPath: string;
}

function getDefaults(): AppConfig {
  return {
    claudeDocsPath: process.env.CLAUDE_DOCS_PATH ?? "",
    googleSharedEmails: (process.env.GOOGLE_SHARED_EMAILS ?? "").split(",").filter(Boolean),
    googleServiceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ?? "./bubble-307922-9a89c49a8a6a.json",
    gdrivePeticionamentoPath: process.env.GDRIVE_PETICIONAMENTO_PATH ?? "",
  };
}

export function loadConfig(): AppConfig {
  const defaults = getDefaults();

  if (!fs.existsSync(CONFIG_PATH)) {
    return defaults;
  }

  try {
    const saved = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    return {
      claudeDocsPath: saved.claudeDocsPath || defaults.claudeDocsPath,
      googleSharedEmails: saved.googleSharedEmails ?? defaults.googleSharedEmails,
      googleServiceAccountKeyPath: saved.googleServiceAccountKeyPath || defaults.googleServiceAccountKeyPath,
      gdrivePeticionamentoPath: saved.gdrivePeticionamentoPath ?? defaults.gdrivePeticionamentoPath,
    };
  } catch {
    return defaults;
  }
}

export function saveConfig(config: Partial<AppConfig>) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const current = loadConfig();
  const merged = { ...current, ...config };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2));

  // Also update process.env so changes take effect immediately
  if (merged.claudeDocsPath) process.env.CLAUDE_DOCS_PATH = merged.claudeDocsPath;
  if (merged.googleSharedEmails) process.env.GOOGLE_SHARED_EMAILS = merged.googleSharedEmails.join(",");
  if (merged.googleServiceAccountKeyPath) process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH = merged.googleServiceAccountKeyPath;
  if (merged.gdrivePeticionamentoPath) process.env.GDRIVE_PETICIONAMENTO_PATH = merged.gdrivePeticionamentoPath;

  return merged;
}

/**
 * Retorna o CLAUDE_DOCS_PATH efetivo (config salva > env).
 */
export function getClaudeDocsPath(): string {
  const config = loadConfig();
  return config.claudeDocsPath;
}
