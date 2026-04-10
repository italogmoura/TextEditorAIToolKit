import path from "path";

const CLAUDE_DOCS_PATH = process.env.CLAUDE_DOCS_PATH ?? "";
const PROCESSOS_DIR = path.join(CLAUDE_DOCS_PATH, "processos");

type WatchCallback = (event: "add" | "change" | "unlink", filePath: string) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let watcher: any = null;

/**
 * Inicia o file watcher na pasta de processos.
 * Monitora adição/mudança de PDFs e índices.
 */
export async function startFileWatcher(callback: WatchCallback) {
  if (watcher) return; // já ativo

  // Dynamic import to avoid build issues
  const chokidar = await import("chokidar");
  watcher = chokidar.watch(PROCESSOS_DIR, {
    ignored: /(^|[\/\\])\../, // ignora dotfiles
    persistent: true,
    depth: 3,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 100 },
  });

  watcher
    .on("add", (filePath: string) => callback("add", filePath))
    .on("change", (filePath: string) => callback("change", filePath))
    .on("unlink", (filePath: string) => callback("unlink", filePath));

  console.log(`[watcher] Monitorando ${PROCESSOS_DIR}`);
}

export function stopFileWatcher() {
  if (watcher) {
    watcher.close();
    watcher = null;
    console.log("[watcher] Parado");
  }
}
