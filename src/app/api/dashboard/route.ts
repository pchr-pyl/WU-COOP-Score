import { fetchDashboardData, createHeaders, buildRestUrl } from "@/lib/score-store/supabase";
export type { DashboardData, ScoreRow, StudentSummary } from "@/lib/score-store/types";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  try {
    const url = new URL(req.url);
    const round = url.searchParams.get('round') || 'network';
    const tableName = round === 'university' ? 'score_submissions' : 'network_score_submissions';

    const body = await req.json();
    const { judgeId, studentId, category, scores, totalScore, maxScore } = body;

    if (!judgeId || !studentId || !category || !scores) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const response = await fetch(
      buildRestUrl(`/${tableName}`, `judge_id=eq.${judgeId}&student_id=eq.${studentId}&category=eq.${category}`),
      {
        method: "PATCH",
        headers: {
          ...createHeaders(),
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          scores,
          total_score: totalScore,
          max_score: maxScore,
          submitted_at: new Date().toISOString(),
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Unable to update submission");
    }

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

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
