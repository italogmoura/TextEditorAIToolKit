import { NextRequest, NextResponse } from "next/server";
import { getProcessDocuments } from "@/lib/filesystem/processes";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const documents = getProcessDocuments(id);
  return NextResponse.json({ processNumber: id, documents });
}
