import { google } from "googleapis";

export const runtime = "nodejs";

const DEFAULT_SHEET_ID = "1tU50_F1_aJjwCBK6ZHwzj8u52KY_W66_-FppZHJTL-8";
const DEFAULT_SHEET_TAB = "ชีต1";

function getServiceAccountCredentials() {
  const jsonBlob = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON;
  if (jsonBlob) {
    const parsed = JSON.parse(jsonBlob) as { client_email?: string; private_key?: string };
    if (parsed.client_email && parsed.private_key) {
      return { client_email: parsed.client_email, private_key: parsed.private_key };
    }
  }
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) throw new Error("Missing Google service account credentials");
  return { client_email: clientEmail, private_key: privateKey };
}

export type ScoreRow = {
  timestamp: string;
  category: string;
  categoryTitle: string;
  studentId: string;
  studentName: string;
  program: string;
  school: string;
  workplace: string;
  project: string;
  judgeId: string;
  judgeName: string;
  judgeDept: string;
  totalScore: number;
  maxScore: number;
  pct: number;
};

export type DashboardData = {
  rows: ScoreRow[];
  totalSubmissions: number;
  byCategory: Record<string, { count: number; avgPct: number; title: string }>;
  byStudent: StudentSummary[];
  lastUpdated: string;
};

export type StudentSummary = {
  studentId: string;
  studentName: string;
  category: string;
  categoryTitle: string;
  program: string;
  school: string;
  workplace: string;
  project: string;
  judgeCount: number;
  avgScore: number;
  maxScore: number;
  avgPct: number;
  scores: number[];
};

export async function GET() {
  try {
    const credentials = getServiceAccountCredentials();
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID || DEFAULT_SHEET_ID;
    const sheetTab = process.env.GOOGLE_SHEET_TAB || DEFAULT_SHEET_TAB;

    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetTab}!A:ZZ`,
    });

    const rawRows = resp.data.values ?? [];
    if (rawRows.length < 2) {
      return Response.json({
        rows: [],
        totalSubmissions: 0,
        byCategory: {},
        byStudent: [],
        lastUpdated: new Date().toISOString(),
      } as DashboardData);
    }

    const headers = rawRows[0] as string[];
    const idxOf = (name: string) => headers.findIndex((h) => h === name);

    const rows: ScoreRow[] = rawRows.slice(1).map((r) => {
      const totalScore = parseFloat((r[idxOf("Total Score")] as string) ?? "0") || 0;
      const maxScore = parseFloat((r[idxOf("Max Score")] as string) ?? "0") || 0;
      return {
        timestamp: (r[idxOf("Timestamp")] as string) ?? "",
        category: (r[idxOf("Category")] as string) ?? "",
        categoryTitle: (r[idxOf("Category Title")] as string) ?? "",
        studentId: (r[idxOf("Student ID")] as string) ?? "",
        studentName: (r[idxOf("Student Name")] as string) ?? "",
        program: (r[idxOf("Program")] as string) ?? "",
        school: (r[idxOf("School")] as string) ?? "",
        workplace: (r[idxOf("Workplace")] as string) ?? "",
        project: (r[idxOf("Project")] as string) ?? "",
        judgeId: (r[idxOf("Judge ID")] as string) ?? "",
        judgeName: (r[idxOf("Judge Name")] as string) ?? "",
        judgeDept: (r[idxOf("Judge Dept")] as string) ?? "",
        totalScore,
        maxScore,
        pct: maxScore > 0 ? (totalScore / maxScore) * 100 : 0,
      };
    });

    // By category stats
    const byCategory: DashboardData["byCategory"] = {};
    for (const row of rows) {
      if (!byCategory[row.category]) {
        byCategory[row.category] = { count: 0, avgPct: 0, title: row.categoryTitle };
      }
      byCategory[row.category].count++;
    }
    for (const cat of Object.keys(byCategory)) {
      const catRows = rows.filter((r) => r.category === cat);
      byCategory[cat].avgPct = catRows.reduce((s, r) => s + r.pct, 0) / catRows.length;
    }

    // By student summary (group by studentId + category)
    const studentMap = new Map<string, StudentSummary>();
    for (const row of rows) {
      const key = `${row.studentId}::${row.category}`;
      if (!studentMap.has(key)) {
        studentMap.set(key, {
          studentId: row.studentId,
          studentName: row.studentName,
          category: row.category,
          categoryTitle: row.categoryTitle,
          program: row.program,
          school: row.school,
          workplace: row.workplace,
          project: row.project,
          judgeCount: 0,
          avgScore: 0,
          maxScore: row.maxScore,
          avgPct: 0,
          scores: [],
        });
      }
      const s = studentMap.get(key)!;
      s.scores.push(row.totalScore);
      s.judgeCount++;
    }
    const byStudent = Array.from(studentMap.values()).map((s) => ({
      ...s,
      avgScore: s.scores.reduce((a, b) => a + b, 0) / s.scores.length,
      avgPct: s.maxScore > 0 ? (s.scores.reduce((a, b) => a + b, 0) / s.scores.length / s.maxScore) * 100 : 0,
    })).sort((a, b) => b.avgPct - a.avgPct);

    return Response.json({
      rows,
      totalSubmissions: rows.length,
      byCategory,
      byStudent,
      lastUpdated: new Date().toISOString(),
    } as DashboardData);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
