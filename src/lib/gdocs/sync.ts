import { getDocumentAsAnnotatedText, insertTextAtEnd, lockDocument, unlockDocument, isDocumentLocked } from "./client";

/**
 * Sync engine: gerencia o sync periódico IA→GDocs.
 * Mantém um JSON local durante a operação da IA e sincroniza a cada intervalo.
 */

interface SyncState {
  docId: string;
  pendingText: string;
  lastSyncedLength: number;
  intervalId: NodeJS.Timeout | null;
  isActive: boolean;
}

const activeSyncs = new Map<string, SyncState>();

/**
 * Inicia sync periódico para um documento durante operação da IA.
 * O texto acumulado é sincronizado a cada `intervalMs` ms.
 */
export function startPeriodicSync(docId: string, intervalMs = 4000): SyncState {
  // Lock o documento
  lockDocument(docId);

  const state: SyncState = {
    docId,
    pendingText: "",
    lastSyncedLength: 0,
    intervalId: null,
    isActive: true,
  };

  state.intervalId = setInterval(async () => {
    if (!state.isActive) return;
    await flushSync(state);
  }, intervalMs);

  activeSyncs.set(docId, state);
  return state;
}

/**
 * Acumula texto produzido pela IA para sync posterior.
 */
export function appendToSync(docId: string, text: string) {
  const state = activeSyncs.get(docId);
  if (state) {
    state.pendingText += text;
  }
}

/**
 * Faz flush do texto pendente para o Google Docs.
 */
async function flushSync(state: SyncState) {
  const newText = state.pendingText.substring(state.lastSyncedLength);
  if (!newText) return;

  try {
    await insertTextAtEnd(state.docId, newText);
    state.lastSyncedLength = state.pendingText.length;
  } catch (error) {
    console.error(`[sync] Erro ao sincronizar doc ${state.docId}:`, error);
  }
}

/**
 * Encerra sync periódico: flush final e unlock do documento.
 */
export async function stopPeriodicSync(docId: string) {
  const state = activeSyncs.get(docId);
  if (!state) return;

  state.isActive = false;
  if (state.intervalId) {
    clearInterval(state.intervalId);
  }

  // Flush final
  await flushSync(state);

  // Unlock
  unlockDocument(docId);

  activeSyncs.delete(docId);
}

/**
 * Verifica se um documento está com sync ativo (IA editando).
 */
export function isSyncActive(docId: string): boolean {
  return activeSyncs.has(docId) || isDocumentLocked(docId);
}

/**
 * Cleanup de emergência: para todos os syncs ativos.
 */
export async function stopAllSyncs() {
  for (const docId of activeSyncs.keys()) {
    await stopPeriodicSync(docId);
  }
}
