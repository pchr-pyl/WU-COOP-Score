import { fetchDashboardData, createHeaders, buildRestUrl } from "@/lib/score-store/supabase";
export type { DashboardData, ScoreRow, StudentSummary } from "@/lib/score-store/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const includeScores = url.searchParams.get('includeScores') === 'true';
    const judgeId = url.searchParams.get('judgeId');
    const round = url.searchParams.get('round') || 'network'; // default เป็นรอบเครือข่าย

    // เลือกตารางตามรอบ
    const tableName = round === 'university' ? 'score_submissions' : 'network_score_submissions';

    const data = await fetchDashboardData(tableName);

    // ถ้าต้องการข้อมูลคะแนนรายข้อ
    if (includeScores && judgeId) {
      // ดึงข้อมูลคะแนนรายข้อจาก Supabase
      const detailedResponse = await fetch(
        buildRestUrl(`/${tableName}`, `select=scores,student_id,student_name,category&judge_id=eq.${judgeId}`),
        {
          method: "GET",
          headers: {
            ...createHeaders(),
            Accept: "application/json",
          },
        }
      );

      if (detailedResponse.ok) {
        const detailedData = await detailedResponse.json();
        return Response.json({
          ...data,
          detailedScores: detailedData || []
        });
      }
    }

    return Response.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
