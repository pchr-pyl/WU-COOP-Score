import type { CategoryKey } from "@/lib/assessment-config";

export type JudgeRecord = {
  id: string;
  name: string;
  dept: string;
  password: string;
  categories: CategoryKey[];
};

export const JUDGE_SESSION_STORAGE_KEY = "wu-coop-active-judge";

export const CATEGORY_META: Record<
  CategoryKey,
  {
    href: string;
    title: string;
    subtitle: string;
  }
> = {
  "sci-tech": {
    href: "/sci-tech",
    title: "วิทยาศาสตร์และเทคโนโลยี",
    subtitle: "Science & Technology",
  },
  "social-huma": {
    href: "/social-huma",
    title: "สังคมศาสตร์ มนุษยศาสตร์",
    subtitle: "Social Sciences & Humanities",
  },
  innovation: {
    href: "/innovation",
    title: "นวัตกรรมดีเด่น",
    subtitle: "Innovation",
  },
  inter: {
    href: "/inter",
    title: "นานาชาติดีเด่น",
    subtitle: "International Achievement",
  },
};

export function normalizeJudgeLookup(value: string) {
  return value.trim().toLowerCase();
}

export function findJudgeByUsername(judges: JudgeRecord[], username: string) {
  const normalized = normalizeJudgeLookup(username);
  return judges.find(
    (judge) =>
      judge.id.toLowerCase() === normalized || normalizeJudgeLookup(judge.name) === normalized,
  );
}

export function canJudgeAccessCategory(judge: Pick<JudgeRecord, "categories">, category: CategoryKey) {
  return judge.categories.includes(category);
}
