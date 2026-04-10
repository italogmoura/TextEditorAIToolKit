import { NextResponse } from "next/server";
import { listProcesses } from "@/lib/filesystem/processes";

export async function GET() {
  const processes = listProcesses();
  return NextResponse.json(processes);
}
