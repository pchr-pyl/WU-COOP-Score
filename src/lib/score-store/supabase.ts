import { buildDashboardData } from "@/lib/score-store/transform";
import type { DashboardData, ScoreRow, StudentSummary, SubmitPayload } from "@/lib/score-store/types";
import { getSupabaseServerConfig } from "@/lib/supabase/server";

type SubmissionRecord = {
  submitted_at: string | null;
  category: string | null;
  category_title: string | null;
  student_id: string | null;
  student_name: string | null;
  student_program: string | null;
  student_school: string | null;
  student_workplace: string | null;
  student_project: string | null;
  judge_id: string | null;
  judge_name: string | null;
  judge_dept: string | null;
  total_score: number | null;
  max_score: number | null;
  score_pct?: number | null;
};

type StudentSummaryRecord = {
  student_id: string | null;
  student_name: string | null;
  category: string | null;
  category_title: string | null;
  program: string | null;
  school: string | null;
  workplace: string | null;
  project: string | null;
  judge_count: number | null;
  avg_score: number | null;
  max_score: number | null;
  avg_pct: number | null;
  scores: Array<number | string> | null;
  last_submitted_at: string | null;
};

type CategorySummaryRecord = {
  category: string | null;
  category_title: string | null;
  submission_count: number | null;
  avg_pct: number | null;
  last_updated: string | null;
};

export function createHeaders() {
  const { serviceRoleKey } = getSupabaseServerConfig();

  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };
}

export function buildRestUrl(path: string, query?: string) {
  const { url } = getSupabaseServerConfig();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const searchParams = query ? `?${query}` : "";
  return `${url}/rest/v1${normalizedPath}${searchParams}`;
}

function mapSubmissionRecord(record: SubmissionRecord): ScoreRow {
  const totalScore = Number(record.total_score ?? 0);
  const maxScore = Number(record.max_score ?? 0);

  return {
    timestamp: record.submitted_at ?? "",
    category: record.category ?? "",
    categoryTitle: record.category_title ?? "",
    studentId: record.student_id ?? "",
    studentName: record.student_name ?? "",
    program: record.student_program ?? "",
    school: record.student_school ?? "",
    workplace: record.student_workplace ?? "",
    project: record.student_project ?? "",
    judgeId: record.judge_id ?? "",
    judgeName: record.judge_name ?? "",
    judgeDept: record.judge_dept ?? "",
    totalScore,
    maxScore,
    pct: record.score_pct !== undefined && record.score_pct !== null
      ? Number(record.score_pct)
      : maxScore > 0
        ? (totalScore / maxScore) * 100
        : 0,
  };
}

function mapStudentSummaryRecord(record: StudentSummaryRecord): StudentSummary {
  return {
    studentId: record.student_id ?? "",
    studentName: record.student_name ?? "",
    category: record.category ?? "",
    categoryTitle: record.category_title ?? "",
    program: record.program ?? "",
    school: record.school ?? "",
    workplace: record.workplace ?? "",
    project: record.project ?? "",
    judgeCount: Number(record.judge_count ?? 0),
    avgScore: Number(record.avg_score ?? 0),
    maxScore: Number(record.max_score ?? 0),
    avgPct: Number(record.avg_pct ?? 0),
    scores: (record.scores ?? []).map((score) => Number(score ?? 0)),
  };
}

export async function saveSubmission(payload: SubmitPayload) {
  const response = await fetch(buildRestUrl("/network_score_submissions", "on_conflict=judge_id,student_id,category"), {
    method: "POST",
    headers: {
      ...createHeaders(),
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify([
      {
        category: payload.category,
        category_title: payload.categoryTitle,
        student_id: payload.student.id,
        student_name: payload.student.name,
        student_program: payload.student.program,
        student_school: payload.student.school,
        student_workplace: payload.student.workplace,
        student_project: payload.student.project,
        judge_id: payload.judge.id,
        judge_name: payload.judge.name,
        judge_dept: payload.judge.dept,
        scores: payload.scores,
        total_score: payload.totalScore,
        max_score: payload.maxScore,
        submitted_at: new Date().toISOString(),
      },
    ]),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Unable to save submission to Supabase");
  }
}

export async function fetchDashboardData(tableName: string = 'score_submissions'): Promise<DashboardData> {
  // กำหนดชื่อ view ตามตาราง
  const studentView = tableName === 'score_submissions' 
    ? 'v_student_score_summary' 
    : 'v_network_student_score_summary';
  const categoryView = tableName === 'score_submissions'
    ? 'v_category_score_summary'
    : 'v_network_category_score_summary';

  const [rowsResponse, studentsResponse, categoriesResponse] = await Promise.all([
    fetch(
    buildRestUrl(
      `/${tableName}`,
      "select=submitted_at,category,category_title,student_id,student_name,student_program,student_school,student_workplace,student_project,judge_id,judge_name,judge_dept,total_score,max_score,score_pct&order=submitted_at.desc",
    ),
    {
      method: "GET",
      headers: {
        ...createHeaders(),
        Accept: "application/json",
      },
    },
  ),
    fetch(
      buildRestUrl(
        `/${studentView}`,
        "select=student_id,student_name,category,category_title,program,school,workplace,project,judge_count,avg_score,max_score,avg_pct,scores,last_submitted_at&order=avg_pct.desc,last_submitted_at.desc",
      ),
      {
        method: "GET",
        headers: {
          ...createHeaders(),
          Accept: "application/json",
        },
      },
    ),
    fetch(
      buildRestUrl(
        `/${categoryView}`,
        "select=category,category_title,submission_count,avg_pct,last_updated",
      ),
      {
        method: "GET",
        headers: {
          ...createHeaders(),
          Accept: "application/json",
        },
      },
    ),
  ]);

  if (!rowsResponse.ok) {
    const text = await rowsResponse.text();
    throw new Error(text || "Unable to load dashboard data from Supabase");
  }

  if (!studentsResponse.ok) {
    const text = await studentsResponse.text();
    throw new Error(text || "Unable to load student summary data from Supabase");
  }

  if (!categoriesResponse.ok) {
    const text = await categoriesResponse.text();
    throw new Error(text || "Unable to load category summary data from Supabase");
  }

  const rowData = (await rowsResponse.json()) as SubmissionRecord[];
  const studentData = (await studentsResponse.json()) as StudentSummaryRecord[];
  const categoryData = (await categoriesResponse.json()) as CategorySummaryRecord[];

  const rows = rowData.map((record: SubmissionRecord) => mapSubmissionRecord(record));
  const fallback = buildDashboardData(rows);
  const byStudent = studentData.map((record: StudentSummaryRecord) => mapStudentSummaryRecord(record));

  const byCategory = categoryData.reduce<DashboardData["byCategory"]>((acc, record) => {
    const category = record.category ?? "";

    if (!category) {
      return acc;
    }

    acc[category] = {
      count: Number(record.submission_count ?? 0),
      avgPct: Number(record.avg_pct ?? 0),
      title: record.category_title ?? category,
    };

    return acc;
  }, {});

  const latestTimestamps = [
    ...rowData.map((record) => record.submitted_at ?? ""),
    ...studentData.map((record) => record.last_submitted_at ?? ""),
    ...categoryData.map((record) => record.last_updated ?? ""),
  ].filter(Boolean);

  return {
    rows,
    totalSubmissions: rows.length,
    byCategory: Object.keys(byCategory).length > 0 ? byCategory : fallback.byCategory,
    byStudent: byStudent.length > 0 ? byStudent : fallback.byStudent,
    lastUpdated:
      latestTimestamps.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ??
      fallback.lastUpdated,
  };
}
