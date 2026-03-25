"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { RefreshCw, Trophy, Users, ClipboardList, TrendingUp, Home } from "lucide-react";
import type { DashboardData, StudentSummary } from "@/lib/score-store/types";

const CATEGORY_LABELS: Record<string, string> = {
  "sci-tech": "วิทย์ฯ & เทคโน",
  "social-huma": "สังคม & มนุษย์",
  innovation: "นวัตกรรม",
  inter: "นานาชาติ",
};

const CATEGORY_COLORS: Record<string, string> = {
  "sci-tech": "#5f00e3",
  "social-huma": "#fe6c00",
  innovation: "#00a86b",
  inter: "#0077cc",
};

const BAR_COLOR = "#9f4200";

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl px-5 py-5 shadow-[0_8px_24px_rgba(25,28,29,0.06)] flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-[#f3f4f5] flex items-center justify-center shrink-0">
        <Icon size={22} className="text-[#9f4200]" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest text-[#191c1d]/45 font-semibold">{label}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {sub && <p className="text-xs text-[#191c1d]/50 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return <span className="text-sm font-bold text-[#191c1d]/40">#{rank}</span>;
}

function StudentRow({
  student,
  rank,
}: {
  student: StudentSummary;
  rank: number;
}) {
  const dot = CATEGORY_COLORS[student.category] ?? "#999";
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[#f0f0f0] last:border-0">
      <div className="w-8 text-center shrink-0">
        <RankBadge rank={rank} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full shrink-0"
            style={{ background: dot }}
          />
          <p className="font-semibold text-sm truncate">{student.studentName}</p>
        </div>
        <p className="text-xs text-[#191c1d]/50 truncate mt-0.5">{student.project || student.workplace}</p>
        <p className="text-[10px] text-[#191c1d]/35 mt-0.5">
          {CATEGORY_LABELS[student.category] ?? student.categoryTitle} · {student.judgeCount} กรรมการ
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-base font-bold tabular-nums">{student.avgPct.toFixed(2)}%</p>
        <p className="text-xs text-[#191c1d]/45 tabular-nums">
          {student.avgScore.toFixed(2)}/{student.maxScore}
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "fetch error");
      setData(json as DashboardData);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000); // auto-refresh every 60s
    return () => clearInterval(interval);
  }, [fetchData]);

  // Filtered students
  const students =
    data?.byStudent.filter((s) => activeCategory === "all" || s.category === activeCategory) ?? [];

  // Bar chart data — category breakdown
  const chartData = Object.entries(data?.byCategory ?? {}).map(([key, val]) => ({
    name: CATEGORY_LABELS[key] ?? key,
    count: val.count,
    avgPct: parseFloat(val.avgPct.toFixed(2)),
    color: CATEGORY_COLORS[key] ?? BAR_COLOR,
  }));

  const totalJudges = data
    ? new Set(data.rows.map((r) => r.judgeId)).size
    : 0;

  const totalStudents = data ? new Set(data.byStudent.map((s) => `${s.studentId}::${s.category}`)).size : 0;

  return (
    <main className="relative min-h-screen bg-[#f8f9fa] text-[#191c1d] px-4 py-8 sm:px-6 md:px-10 leading-[1.75] overflow-hidden">
      {/* Accent bar */}
      <div className="fixed top-0 left-0 h-1 w-full bg-gradient-to-r from-[#9f4200] to-[#fe6c00] z-50" />

      {/* BG blobs */}
      <div className="pointer-events-none fixed -top-24 -left-16 w-80 h-80 rounded-full bg-[#5f00e3]/5 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 right-0 w-96 h-96 rounded-full bg-[#fe6c00]/6 blur-3xl" />

      <div className="relative mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#5f00e3]/60 font-semibold">WU COOP SCORE 2026</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard คะแนน</h1>
            {lastRefresh && (
              <p className="text-xs text-[#191c1d]/40 mt-0.5">
                อัปเดตล่าสุด {lastRefresh.toLocaleTimeString("th-TH")}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-sm text-sm font-medium hover:bg-[#f3f4f5] transition-colors"
            >
              <Home size={15} /> หน้าหลัก
            </Link>
            <Link
              href="/judge-summary"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-sm text-sm font-medium hover:bg-[#f3f4f5] transition-colors"
            >
              <Users size={15} /> สรุปรายอาจารย์
            </Link>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-[#9f4200] to-[#fe6c00] text-white text-sm font-medium disabled:opacity-60 hover:opacity-90 transition-opacity"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              {loading ? "กำลังโหลด..." : "รีเฟรช"}
            </button>
          </div>
        </header>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-700">
            ⚠️ <strong>เกิดข้อผิดพลาด:</strong> {error}
            <br />
            <span className="text-xs text-red-500 mt-1 block">ตรวจสอบว่าตั้งค่า Supabase environment variables และตารางข้อมูลพร้อมใช้งานแล้ว</span>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Submissions" value={data?.totalSubmissions ?? "—"} icon={ClipboardList} sub="รายการทั้งหมด" />
          <StatCard label="นักศึกษา" value={totalStudents} icon={Users} sub="คนที่มีคะแนน" />
          <StatCard label="กรรมการ" value={totalJudges} icon={Trophy} sub="ที่ให้คะแนนแล้ว" />
          <StatCard
            label="เฉลี่ยรวม"
            value={
              data && data.rows.length > 0
                ? `${(data.rows.reduce((s, r) => s + r.pct, 0) / data.rows.length).toFixed(2)}%`
                : "—"
            }
            icon={TrendingUp}
            sub="% ของคะแนนสูงสุด"
          />
        </div>

        {/* Category breakdown chart */}
        {chartData.length > 0 && (
          <section className="bg-white rounded-2xl px-5 py-5 shadow-[0_8px_24px_rgba(25,28,29,0.06)]">
            <h2 className="text-base font-bold mb-4">สรุปตามประเภท</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={36}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 11 }} label={{ value: "จำนวน", angle: -90, position: "insideLeft", fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} label={{ value: "% เฉลี่ย", angle: 90, position: "insideRight", fontSize: 11 }} />
                <Tooltip
                  formatter={(value, name) => {
                    const numericValue = typeof value === "number" ? value : 0;
                    return name === "avgPct" ? [`${numericValue}%`, "เฉลี่ย"] : [numericValue, "จำนวน"];
                  }}
                />
                <Bar yAxisId="left" dataKey="count" name="count" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
                <Bar yAxisId="right" dataKey="avgPct" name="avgPct" fill="#e5e7eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </section>
        )}

        {/* Ranking table */}
        <section className="bg-white rounded-2xl px-5 py-5 shadow-[0_8px_24px_rgba(25,28,29,0.06)]">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h2 className="text-base font-bold">อันดับคะแนนนักศึกษา</h2>
            <div className="flex gap-2 flex-wrap">
              {[
                { key: "all", label: "ทั้งหมด" },
                { key: "sci-tech", label: "วิทย์ฯ" },
                { key: "social-huma", label: "สังคม" },
                { key: "innovation", label: "นวัตกรรม" },
                { key: "inter", label: "นานาชาติ" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveCategory(tab.key)}
                  className={[
                    "px-3 py-1 rounded-lg text-xs font-semibold transition-colors",
                    activeCategory === tab.key
                      ? "bg-gradient-to-br from-[#9f4200] to-[#fe6c00] text-white"
                      : "bg-[#f3f4f5] text-[#191c1d]/60 hover:bg-[#e8e9ea]",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="py-10 text-center text-sm text-[#191c1d]/40 animate-pulse">กำลังโหลดข้อมูล...</div>
          )}

          {!loading && students.length === 0 && !error && (
            <div className="py-10 text-center text-sm text-[#191c1d]/40">
              ยังไม่มีข้อมูลคะแนน — รอกรรมการส่งคะแนน
            </div>
          )}

          {students.map((s, i) => (
            <StudentRow key={`${s.studentId}-${s.category}`} student={s} rank={i + 1} />
          ))}
        </section>

        {/* Raw log (collapsible) */}
        {data && data.rows.length > 0 && (
          <details className="bg-white rounded-2xl px-5 py-4 shadow-[0_8px_24px_rgba(25,28,29,0.06)]">
            <summary className="text-sm font-semibold cursor-pointer select-none">
              📋 Log ทั้งหมด ({data.rows.length} รายการ)
            </summary>
            <div className="mt-3 overflow-x-auto">
              <table className="text-xs w-full border-collapse">
                <thead>
                  <tr className="text-left text-[#191c1d]/50 border-b">
                    <th className="pb-2 pr-3 font-semibold">เวลา</th>
                    <th className="pb-2 pr-3 font-semibold">นักศึกษา</th>
                    <th className="pb-2 pr-3 font-semibold">ประเภท</th>
                    <th className="pb-2 pr-3 font-semibold">กรรมการ</th>
                    <th className="pb-2 pr-3 font-semibold text-right">คะแนน</th>
                    <th className="pb-2 font-semibold text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r, i) => (
                    <tr key={i} className="border-b border-[#f8f8f8] last:border-0 hover:bg-[#fafafa]">
                      <td className="py-1.5 pr-3 text-[#191c1d]/40 whitespace-nowrap">
                        {new Date(r.timestamp).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="py-1.5 pr-3 font-medium">{r.studentName}</td>
                      <td className="py-1.5 pr-3 text-[#191c1d]/60">{CATEGORY_LABELS[r.category] ?? r.category}</td>
                      <td className="py-1.5 pr-3 text-[#191c1d]/60">{r.judgeName}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{r.totalScore}/{r.maxScore}</td>
                      <td className="py-1.5 text-right tabular-nums font-semibold">{r.pct.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </div>
    </main>
  );
}
