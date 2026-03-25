import { saveSubmission, updateSubmission, checkExistingSubmission } from "@/lib/score-store/supabase";
import type { SubmitPayload } from "@/lib/score-store/types";

export const runtime = "nodejs";

const VALID_CATEGORIES = new Set(["sci-tech", "social-huma", "innovation", "inter"]);

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<SubmitPayload> & { isEdit?: boolean };

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

    // ตรวจสอบว่ามีการประเมินอยู่แล้วหรือไม่
    const existing = await checkExistingSubmission(
      body.student.id,
      body.judge.id,
      body.category
    );

    // ถ้าไม่มีการประเมินอยู่แล้ว หรือเป็นการแก้ไข ให้ดำเนินการต่อ
    if (!existing || body.isEdit) {
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
      console.log("Is Edit:", body.isEdit);
      console.log("Existing:", !!existing);
      console.log("Payload:", JSON.stringify(payload, null, 2));

      if (body.isEdit && existing) {
        // อัปเดตการประเมินที่มีอยู่แล้ว
        await updateSubmission(body.student.id, body.judge.id, body.category, payload);
      } else {
        // สร้างการประเมินใหม่ (หรือ merge ถ้ามี conflict)
        await saveSubmission(payload);
      }

      return Response.json({ ok: true, isEdit: body.isEdit });
    } else {
      // มีการประเมินอยู่แล้วและไม่ใช่การแก้ไข
      return Response.json({ 
        error: "นักศึกษาคนนี้ถูกประเมินโดยกรรมการคนนี้แล้ว กรุณาใช้การแก้ไขคะแนนแทนการส่งใหม่" 
      }, { status: 409 });
    }
  } catch (error) {
    console.error("Submit Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
