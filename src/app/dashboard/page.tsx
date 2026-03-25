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
    <div className="bg-white rounded-2xl px-6 py-6 shadow-[0_8px_24px_rgba(25,28,29,0.06)] flex items-center gap-4 hover:shadow-lg transition-all">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#f3f4f5] to-[#e8e9ea] flex items-center justify-center shrink-0">
        <Icon size={24} className="text-[#9f4200]" />
      </div>
      <div className="flex-1">
        <p className="text-xs uppercase tracking-widest text-[#191c1d]/45 font-semibold">{label}</p>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        {sub && <p className="text-xs text-[#191c1d]/50 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const badgeStyles = {
    1: "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-lg",
    2: "bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-lg", 
    3: "bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg",
    default: "bg-gradient-to-br from-gray-200 to-gray-400 text-white"
  };
  
  const badgeClass = badgeStyles[rank as keyof typeof badgeStyles] || badgeStyles.default;
  
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${badgeClass}`}>
      {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}
    </div>
  );
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
    <div className="group bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-xl transition-all">
      <div className="flex items-center gap-6">
        {/* Rank Badge */}
        <div className="flex-shrink-0">
          <RankBadge rank={rank} />
        </div>
        
        {/* Student Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <span
              className="inline-block w-4 h-4 rounded-full shrink-0 shadow-md"
              style={{ background: dot }}
            />
            <h3 className="text-lg font-bold text-[#191c1d] truncate">{student.studentName}</h3>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-gray-600 line-clamp-1">{student.project || student.workplace}</p>
            <div className="flex items-center gap-3 text-xs">
              <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                {CATEGORY_LABELS[student.category] ?? student.categoryTitle}
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600">{student.judgeCount} กรรมการ</span>
            </div>
          </div>
        </div>
        
        {/* Score */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="text-right">
            <p className="text-3xl font-bold tabular-nums text-[#9f4200]">{student.avgPct.toFixed(2)}%</p>
            <p className="text-xs text-gray-500 tabular-nums">
              {student.avgScore.toFixed(2)}/{student.maxScore}
            </p>
          </div>
        </div>
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

      <div className="relative mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <header className="sticky top-0 bg-[#f8f9fa] z-20 px-4 py-4 backdrop-blur-sm border-b border-gray-200">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-[#5f00e3]/10 to-[#7b3ff2]/10 rounded-full border border-[#5f00e3]/20">
                <span className="text-[#5f00e3] uppercase tracking-[0.2em] text-xs font-bold">WU COOP SCORE 2026</span>
                <div className="w-2 h-2 bg-[#5f00e3] rounded-full animate-pulse"></div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-[#191c1d] to-[#5f00e3] bg-clip-text text-transparent">
                Dashboard คะแนน
              </h1>
              {lastRefresh && (
                <p className="text-sm text-[#191c1d]/60 mt-2">
                  อัปเดตล่าสุด {lastRefresh.toLocaleTimeString("th-TH")}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-md text-sm font-medium hover:bg-[#f3f4f5] transition-all hover:shadow-lg"
              >
                <Home size={16} /> หน้าหลัก
              </Link>
              <Link
                href="/judge-summary"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-md text-sm font-medium hover:bg-[#f3f4f5] transition-all hover:shadow-lg"
              >
                <Users size={16} /> สรุปรายอาจารย์
              </Link>
              <button
                onClick={fetchData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-[#9f4200] to-[#fe6c00] text-white text-sm font-medium disabled:opacity-60 hover:shadow-lg transition-all hover:scale-[1.02] disabled:hover:scale-100"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                {loading ? "กำลังโหลด..." : "รีเฟรช"}
              </button>
            </div>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="รายการประเมิน" value={data?.totalSubmissions ?? "—"} icon={ClipboardList} sub="ทั้งหมด" />
          <StatCard label="นักศึกษา" value={totalStudents} icon={Users} sub="ที่มีคะแนน" />
          <StatCard label="กรรมการ" value={totalJudges} icon={Trophy} sub="ที่ให้คะแนน" />
          <StatCard
            label="คะแนนเฉลี่ย"
            value={
              data && data.rows.length > 0
                ? `${(data.rows.reduce((s, r) => s + r.pct, 0) / data.rows.length).toFixed(2)}%`
                : "—"
            }
            icon={TrendingUp}
            sub="เฉลี่ยรวม"
          />
        </div>

        {/* Category breakdown chart */}
        {chartData.length > 0 && (
          <section className="bg-white rounded-2xl px-6 py-6 shadow-[0_8px_24px_rgba(25,28,29,0.06)]">
            <h2 className="text-lg font-bold mb-6">สรุปตามประเภท</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} barSize={40}>
                <XAxis dataKey="name" tick={{ fontSize: 13 }} />
                <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 12 }} label={{ value: "จำนวน", angle: -90, position: "insideLeft", fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} unit="%" domain={[0, 100]} label={{ value: "% เฉลี่ย", angle: 90, position: "insideRight", fontSize: 12 }} />
                <Tooltip
                  formatter={(value, name) => {
                    const numericValue = typeof value === "number" ? value : 0;
                    return name === "avgPct" ? [`${numericValue}%`, "เฉลี่ย"] : [numericValue, "จำนวน"];
                  }}
                />
                <Bar yAxisId="left" dataKey="count" name="count" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
                <Bar yAxisId="right" dataKey="avgPct" name="avgPct" fill="#e5e7eb" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </section>
        )}

        {/* Ranking table */}
        <section className="bg-white rounded-2xl px-6 py-6 shadow-[0_8px_24px_rgba(25,28,29,0.06)]">
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <div>
              <h2 className="text-lg font-bold">อันดับคะแนนนักศึกษา</h2>
              <p className="text-sm text-[#191c1d]/60">จัดอันดับตามเปอร์เซนต์เฉลี่ย</p>
            </div>
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
                    "px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                    activeCategory === tab.key
                      ? "bg-gradient-to-br from-[#9f4200] to-[#fe6c00] text-white shadow-md"
                      : "bg-[#f3f4f5] text-[#191c1d]/70 hover:bg-[#e8e9ea] hover:text-[#191c1c]",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="py-16 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#f3f4f5] rounded-xl">
                <div className="w-4 h-4 border-2 border-[#9f4200] border-t-transparent animate-spin rounded-full"></div>
                <span className="text-sm text-[#191c1d]/60">กำลังโหลดข้อมูล...</span>
              </div>
            </div>
          )}

          {!loading && students.length === 0 && !error && (
            <div className="py-16 text-center">
              <div className="inline-flex flex-col items-center gap-3 px-6 py-8 bg-[#f3f4f5] rounded-2xl">
                <div className="w-12 h-12 bg-[#e8e9ea] rounded-full flex items-center justify-center">
                  <ClipboardList size={20} className="text-[#191c1c]/50" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#191c1c]">ยังไม่มีข้อมูลคะแนน</p>
                  <p className="text-xs text-[#191c1d]/50">รอกรรมการส่งคะแนน</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {students.map((s, i) => (
              <StudentRow key={`${s.studentId}-${s.category}`} student={s} rank={i + 1} />
            ))}
          </div>
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
