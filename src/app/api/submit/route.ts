import { google } from "googleapis";

export const runtime = "nodejs";

const DEFAULT_SHEET_ID = "1tU50_F1_aJjwCBK6ZHwzj8u52KY_W66_-FppZHJTL-8";
const DEFAULT_SHEET_TAB = "Sheet1";

type SubmitPayload = {
  category: string;
  categoryTitle: string;
  student: {
    id: string;
    name: string;
    program: string;
    school: string;
    workplace: string;
    project: string;
  };
  judge: {
    id: string;
    name: string;
    dept: string;
  };
  scores: Record<string, number>;
  totalScore: number;
  maxScore: number;
};

function getServiceAccountCredentials() {
  const jsonBlob = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON;
  if (jsonBlob) {
    const parsed = JSON.parse(jsonBlob) as { client_email?: string; private_key?: string };
    if (parsed.client_email && parsed.private_key) {
      return {
        client_email: parsed.client_email,
        private_key: parsed.private_key,
      };
    }
  }

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("Missing Google service account credentials");
  }

  return {
    client_email: clientEmail,
    private_key: privateKey,
  };
}

function buildHeaders(scoreKeys: string[]) {
  return [
    "Timestamp",
    "Category",
    "Category Title",
    "Student ID",
    "Student Name",
    "Program",
    "School",
    "Workplace",
    "Project",
    "Judge ID",
    "Judge Name",
    "Judge Dept",
    ...scoreKeys.map((k) => `Score_${k}`),
    "Total Score",
    "Max Score",
    "Score Detail JSON",
  ];
}

function buildRow(payload: SubmitPayload, scoreKeys: string[]) {
  const now = new Date().toISOString();
  return [
    now,
    payload.category,
    payload.categoryTitle,
    payload.student.id,
    payload.student.name,
    payload.student.program,
    payload.student.school,
    payload.student.workplace,
    payload.student.project,
    payload.judge.id,
    payload.judge.name,
    payload.judge.dept,
    ...scoreKeys.map((k) => payload.scores[k] ?? 0),
    payload.totalScore,
    payload.maxScore,
    JSON.stringify(payload.scores),
  ];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<SubmitPayload>;

    if (!body.student?.id || !body.student?.name || !body.judge?.id || !body.judge?.name) {
      return Response.json({ error: "Invalid payload" }, { status: 400 });
    }

    const scores = body.scores ?? {};
    const scoreKeys = Object.keys(scores).sort();

    const payload: SubmitPayload = {
      category: body.category ?? "unknown",
      categoryTitle: body.categoryTitle ?? "Unknown",
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
      totalScore: Number(body.totalScore ?? 0),
      maxScore: Number(body.maxScore ?? 0),
    };

    const credentials = getServiceAccountCredentials();
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID || DEFAULT_SHEET_ID;
    const sheetTab = process.env.GOOGLE_SHEET_TAB || DEFAULT_SHEET_TAB;

    const headerRange = `${sheetTab}!A1:ZZ1`;
    const headerResp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: headerRange,
    });

    const existingHeader = headerResp.data.values?.[0] ?? [];
    const nextHeader = buildHeaders(scoreKeys);

    if (existingHeader.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetTab}!A1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [nextHeader],
        },
      });
    }

    const row = buildRow(payload, scoreKeys);
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetTab}!A:ZZ`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [row],
      },
    });

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
