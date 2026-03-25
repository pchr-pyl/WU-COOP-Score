export type SubmitPayload = {
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

export type DashboardData = {
  rows: ScoreRow[];
  totalSubmissions: number;
  byCategory: Record<string, { count: number; avgPct: number; title: string }>;
  byStudent: StudentSummary[];
  lastUpdated: string;
};
