import { google } from "googleapis";
import path from "path";

const KEY_PATH =
  process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ??
  "./bubble-307922-9a89c49a8a6a.json";
const SHARED_EMAILS = (process.env.GOOGLE_SHARED_EMAILS ?? "").split(",").filter(Boolean);

let _auth: ReturnType<typeof google.auth.GoogleAuth.prototype.getClient> | null = null;

async function getAuth() {
  if (!_auth) {
    const keyPath = path.resolve(process.cwd(), KEY_PATH);
    const auth = new google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: [
        "https://www.googleapis.com/auth/documents",
        "https://www.googleapis.com/auth/drive",
      ],
    });
    _auth = auth.getClient();
  }
  return _auth;
}

export async function getDocsClient() {
  const auth = await getAuth();
  return google.docs({ version: "v1", auth: auth as Parameters<typeof google.docs>[0]["auth"] });
}

export async function getDriveClient() {
  const auth = await getAuth();
  return google.drive({ version: "v3", auth: auth as Parameters<typeof google.drive>[0]["auth"] });
}

export async function createDocument(title: string, folderId?: string): Promise<string> {
  const docs = await getDocsClient();
  const drive = await getDriveClient();

  // Create document
  const doc = await docs.documents.create({
    requestBody: { title },
  });

  const docId = doc.data.documentId!;

  // Move to folder if specified
  if (folderId) {
    await drive.files.update({
      fileId: docId,
      addParents: folderId,
      fields: "id, parents",
    });
  }

  // Share with all configured emails
  for (const email of SHARED_EMAILS) {
    try {
      await drive.permissions.create({
        fileId: docId,
        requestBody: {
          type: "user",
          role: "writer",
          emailAddress: email.trim(),
        },
        sendNotificationEmail: false,
      });
    } catch (error) {
      console.warn(`Failed to share with ${email}:`, error);
    }
  }

  return docId;
}

/**
 * Upload de um .docx local como Google Doc (com conversão automática).
 * O Google Drive converte .docx para Google Docs format nativamente.
 */
export async function uploadDocxAsGoogleDoc(
  localPath: string,
  title: string,
  folderId?: string
): Promise<string> {
  const drive = await getDriveClient();
  const fs = await import("fs");

  const fileStream = fs.createReadStream(localPath);

  const file = await drive.files.create({
    requestBody: {
      name: title,
      mimeType: "application/vnd.google-apps.document", // Convert to Google Docs
      parents: folderId ? [folderId] : undefined,
    },
    media: {
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      body: fileStream,
    },
    fields: "id",
  });

  const docId = file.data.id!;

  // Share with all configured emails
  for (const email of SHARED_EMAILS) {
    try {
      await drive.permissions.create({
        fileId: docId,
        requestBody: {
          type: "user",
          role: "writer",
          emailAddress: email.trim(),
        },
        sendNotificationEmail: false,
      });
    } catch { /* ignore */ }
  }

  return docId;
}

export async function getDocumentContent(docId: string) {
  const docs = await getDocsClient();
  const doc = await docs.documents.get({ documentId: docId });
  return doc.data;
}

export async function getDocumentAsAnnotatedText(docId: string): Promise<string> {
  const doc = await getDocumentContent(docId);
  const content = doc.body?.content ?? [];
  const lines: string[] = [];
  let paragraphIndex = 1;

  for (const element of content) {
    if (element.paragraph) {
      const text = element.paragraph.elements
        ?.map((e) => e.textRun?.content ?? "")
        .join("")
        .replace(/\n$/, "");

      if (text) {
        const startIdx = element.startIndex ?? 0;
        const endIdx = element.endIndex ?? 0;
        lines.push(`[§${paragraphIndex} idx:${startIdx}-${endIdx}] ${text}`);
        paragraphIndex++;
      }
    }
  }

  return lines.join("\n");
}

export async function applyEdits(
  docId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requests: any[]
) {
  const docs = await getDocsClient();
  return docs.documents.batchUpdate({
    documentId: docId,
    requestBody: { requests },
  });
}

export async function insertTextAtEnd(docId: string, text: string) {
  const doc = await getDocumentContent(docId);
  const content = doc.body?.content ?? [];
  const lastElement = content[content.length - 1];
  const endIndex = (lastElement?.endIndex ?? 1) - 1;

  const docs = await getDocsClient();
  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: Math.max(1, endIndex) },
            text,
          },
        },
      ],
    },
  });
}

export async function exportAsDocx(docId: string, outputPath: string) {
  const drive = await getDriveClient();
  const fs = await import("fs");

  const response = await drive.files.export(
    {
      fileId: docId,
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    { responseType: "arraybuffer" }
  );

  fs.writeFileSync(outputPath, Buffer.from(response.data as ArrayBuffer));
}

export async function createOrGetFolder(
  folderName: string,
  parentId?: string
): Promise<string> {
  const drive = await getDriveClient();

  // Check if folder already exists
  let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }

  const existing = await drive.files.list({ q: query, fields: "files(id)" });
  if (existing.data.files && existing.data.files.length > 0) {
    return existing.data.files[0].id!;
  }

  // Create folder
  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
    },
    fields: "id",
  });

  const folderId = folder.data.id!;

  // Share with all configured emails
  for (const email of SHARED_EMAILS) {
    try {
      await drive.permissions.create({
        fileId: folderId,
        requestBody: {
          type: "user",
          role: "writer",
          emailAddress: email.trim(),
        },
        sendNotificationEmail: false,
      });
    } catch {
      // ignore share errors
    }
  }

  return folderId;
}

// Lock state managed in-app (not via Drive permissions, as inherited permissions can't be downgraded)
const lockedDocs = new Set<string>();

export function lockDocument(docId: string) {
  lockedDocs.add(docId);
  console.log(`[gdocs] Document ${docId} locked (IA editing)`);
}

export function unlockDocument(docId: string) {
  lockedDocs.delete(docId);
  console.log(`[gdocs] Document ${docId} unlocked`);
}

export function isDocumentLocked(docId: string): boolean {
  return lockedDocs.has(docId);
}
