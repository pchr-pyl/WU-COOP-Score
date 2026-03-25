// Setup complete — this route is disabled
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET() {
  return NextResponse.json({ error: "Setup already completed. Route disabled." }, { status: 410 });
}
