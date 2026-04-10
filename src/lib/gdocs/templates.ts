import { getDriveClient, getDocsClient } from "./client";
import { getMpfFormattingRequests } from "./formatting";

const SHARED_EMAILS = (process.env.GOOGLE_SHARED_EMAILS ?? "").split(",").filter(Boolean);

// ID do template MPF no Google Docs (será configurado na primeira execução)
let mpfTemplateId: string | null = null;

/**
 * Cria ou recupera o template MPF no Google Docs.
 * O template contém o cabeçalho institucional e formatação padrão.
 */
export async function getOrCreateMpfTemplate(): Promise<string> {
  if (mpfTemplateId) return mpfTemplateId;

  const drive = await getDriveClient();

  // Verificar se já existe
  const existing = await drive.files.list({
    q: "name='[TEMPLATE] MPF - Peça Processual' and mimeType='application/vnd.google-apps.document' and trashed=false",
    fields: "files(id)",
  });

  if (existing.data.files && existing.data.files.length > 0) {
    mpfTemplateId = existing.data.files[0].id!;
    return mpfTemplateId;
  }

  // Criar template
  const docs = await getDocsClient();
  const doc = await docs.documents.create({
    requestBody: { title: "[TEMPLATE] MPF - Peça Processual" },
  });

  const docId = doc.data.documentId!;

  // Inserir cabeçalho institucional
  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: "\n\n\n\n",
          },
        },
      ],
    },
  });

  // Aplicar formatação MPF
  try {
    const formattingRequests = getMpfFormattingRequests(docId);
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: { requests: formattingRequests },
    });
  } catch {
    // Formatação pode falhar se o doc estiver vazio demais
  }

  // Compartilhar
  for (const email of SHARED_EMAILS) {
    try {
      await drive.permissions.create({
        fileId: docId,
        requestBody: { type: "user", role: "writer", emailAddress: email.trim() },
        sendNotificationEmail: false,
      });
    } catch { /* ignore */ }
  }

  mpfTemplateId = docId;
  return docId;
}

/**
 * Cria um novo documento a partir do template MPF.
 */
export async function createFromTemplate(
  title: string,
  folderId?: string
): Promise<string> {
  const templateId = await getOrCreateMpfTemplate();
  const drive = await getDriveClient();

  // Copiar template
  const copy = await drive.files.copy({
    fileId: templateId,
    requestBody: {
      name: title,
      parents: folderId ? [folderId] : undefined,
    },
  });

  const newDocId = copy.data.id!;

  // Compartilhar
  for (const email of SHARED_EMAILS) {
    try {
      await drive.permissions.create({
        fileId: newDocId,
        requestBody: { type: "user", role: "writer", emailAddress: email.trim() },
        sendNotificationEmail: false,
      });
    } catch { /* ignore */ }
  }

  return newDocId;
}
