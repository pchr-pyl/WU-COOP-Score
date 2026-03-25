import { saveSubmission } from "@/lib/score-store/supabase";
import type { SubmitPayload } from "@/lib/score-store/types";

export const runtime = "nodejs";

const VALID_CATEGORIES = new Set(["sci-tech", "social-huma", "innovation", "inter"]);

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<SubmitPayload>;

    if (!body.student?.id || !body.student?.name || !body.judge?.id || !body.judge?.name) {
      return Response.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (!body.category || !VALID_CATEGORIES.has(body.category)) {
      return Response.json({ error: "Invalid category" }, { status: 400 });
    }

    const scores =
      body.scores && typeof body.scores === "object" && !Array.isArray(body.scores) ? body.scores : null;

    if (!scores) {
      return Response.json({ error: "Invalid scores payload" }, { status: 400 });
    }

    const totalScore = Number(body.totalScore);
    const maxScore = Number(body.maxScore);

    if (!Number.isFinite(totalScore) || !Number.isFinite(maxScore) || maxScore <= 0) {
      return Response.json({ error: "Invalid score totals" }, { status: 400 });
    }

    const payload: SubmitPayload = {
      category: body.category,
      categoryTitle: body.categoryTitle ?? body.category,
      student: {
        id: body.student.id,
        name: body.student.name,
        program: body.student.program ?? "",
        school: body.student.school ?? "",
        workplace: body.student.workplace ?? "",
        project: body.student.project ?? "",
      },
      judge: {
        id: body.judge.id,
        name: body.judge.name,
        dept: body.judge.dept ?? "",
      },
      scores,
      totalScore,
      maxScore,
    };

    console.log("=== Submit Debug ===");
    console.log("Payload:", JSON.stringify(payload, null, 2));
    
    await saveSubmission(payload);

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Submit Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
