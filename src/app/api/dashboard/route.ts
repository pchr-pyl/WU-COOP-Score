import { fetchDashboardData } from "@/lib/score-store/supabase";
export type { DashboardData, ScoreRow, StudentSummary } from "@/lib/score-store/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await fetchDashboardData();

    return Response.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
