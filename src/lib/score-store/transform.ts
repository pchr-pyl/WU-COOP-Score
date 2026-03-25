import type { DashboardData, ScoreRow, StudentSummary } from "@/lib/score-store/types";

export function buildEmptyDashboardData(): DashboardData {
  return {
    rows: [],
    totalSubmissions: 0,
    byCategory: {},
    byStudent: [],
    lastUpdated: new Date().toISOString(),
  };
}

export function buildDashboardData(rows: ScoreRow[]): DashboardData {
  if (rows.length === 0) {
    return buildEmptyDashboardData();
  }

  const byCategory: DashboardData["byCategory"] = {};
  for (const row of rows) {
    if (!byCategory[row.category]) {
      byCategory[row.category] = { count: 0, avgPct: 0, title: row.categoryTitle };
    }
    byCategory[row.category].count++;
  }

  for (const category of Object.keys(byCategory)) {
    const categoryRows = rows.filter((row) => row.category === category);
    byCategory[category].avgPct =
      categoryRows.reduce((sum, row) => sum + row.pct, 0) / categoryRows.length;
  }

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

    const summary = studentMap.get(key);
    if (!summary) {
      continue;
    }

    summary.scores.push(row.totalScore);
    summary.judgeCount++;
  }

  const byStudent = Array.from(studentMap.values())
    .map((summary) => {
      const total = summary.scores.reduce((sum, score) => sum + score, 0);
      const avgScore = total / summary.scores.length;
      const avgPct = summary.maxScore > 0 ? (avgScore / summary.maxScore) * 100 : 0;

      return {
        ...summary,
        avgScore,
        avgPct,
      };
    })
    .sort((a, b) => b.avgPct - a.avgPct);

  return {
    rows,
    totalSubmissions: rows.length,
    byCategory,
    byStudent,
    lastUpdated: new Date().toISOString(),
  };
}
