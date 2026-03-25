"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, Home, RefreshCw, UserRound } from "lucide-react";
import type { DashboardData, ScoreRow } from "@/app/api/dashboard/route";
import { JUDGE_SESSION_STORAGE_KEY, type JudgeRecord } from "@/lib/judge-session";

export default function JudgeSummaryClient() {
  const [judge, setJudge] = useState<JudgeRecord | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "fetch error");
      }
      setData(json as DashboardData);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const stored = window.localStorage.getItem(JUDGE_SESSION_STORAGE_KEY);
    if (stored) {
      try {
        setJudge(JSON.parse(stored) as JudgeRecord);
      } catch {
        window.localStorage.removeItem(JUDGE_SESSION_STORAGE_KEY);
      }
    }
    void fetchData();
  }, []);

  const rows = useMemo<ScoreRow[]>(() => {
    if (!judge || !data) return [];
    return data.rows.filter((row) => row.judgeId === judge.id);
  }, [data, judge]);

  const totalScore = rows.reduce((sum, row) => sum + row.totalScore, 0);
  const uniqueStudents = new Set(rows.map((row) => `${row.studentId}::${row.category}`));

  return (
    <main className="relative min-h-screen bg-[#f8f9fa] text-[#191c1d] px-4 py-8 sm:px-6 md:px-10 leading-[1.75] overflow-hidden">
      <div className="fixed top-0 left-0 h-1 w-full bg-gradient-to-r from-[#9f4200] to-[#fe6c00] z-50" />
      <div className="relative mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#5f00e3]/60 font-semibold">WU COOP SCORE 2026</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">สรุปผลการประเมินรายอาจารย์</h1>
            {judge ? <p className="text-sm text-[#191c1d]/55 mt-1">{judge.name} · {judge.dept}</p> : <p className="text-sm text-[#191c1d]/55 mt-1">กรุณาเข้าสู่ระบบจากหน้าแรกก่อน</p>}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-sm text-sm font-medium hover:bg-[#f3f4f5] transition-colors">
              <Home size={15} /> หน้าหลัก
            </Link>
            <button onClick={() => void fetchData()} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-[#9f4200] to-[#fe6c00] text-white text-sm font-medium disabled:opacity-60 hover:opacity-90 transition-opacity">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> รีเฟรช
            </button>
          </div>
        </header>

        {!judge && (
          <div className="bg-white rounded-2xl px-5 py-8 shadow-[0_8px_24px_rgba(25,28,29,0.06)] text-center text-[#191c1d]/60">
            ยังไม่มีข้อมูลกรรมการในเครื่องนี้ กรุณากลับไปที่หน้าแรกเพื่อกรอก password ของอาจารย์ก่อน
          </div>
        )}

        {judge && (
          <>
            <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl px-5 py-5 shadow-[0_8px_24px_rgba(25,28,29,0.06)] flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#f3f4f5] flex items-center justify-center shrink-0"><ClipboardList size={22} className="text-[#9f4200]" /></div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#191c1d]/45 font-semibold">จำนวนครั้งที่ประเมิน</p>
                  <p className="text-2xl font-bold tracking-tight">{rows.length}</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl px-5 py-5 shadow-[0_8px_24px_rgba(25,28,29,0.06)] flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#f3f4f5] flex items-center justify-center shrink-0"><UserRound size={22} className="text-[#9f4200]" /></div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#191c1d]/45 font-semibold">นักศึกษาที่ประเมินแล้ว</p>
                  <p className="text-2xl font-bold tracking-tight">{uniqueStudents.size}</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl px-5 py-5 shadow-[0_8px_24px_rgba(25,28,29,0.06)] flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#f3f4f5] flex items-center justify-center shrink-0"><ClipboardList size={22} className="text-[#9f4200]" /></div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#191c1d]/45 font-semibold">คะแนนรวมที่ให้ไป</p>
                  <p className="text-2xl font-bold tracking-tight">{totalScore}</p>
                </div>
              </div>
            </section>

            {error && <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-700">เกิดข้อผิดพลาด: {error}</div>}

            <section className="bg-white rounded-2xl px-5 py-5 shadow-[0_8px_24px_rgba(25,28,29,0.06)]">
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <h2 className="text-base font-bold">รายการที่อาจารย์ท่านนี้ประเมินแล้ว</h2>
                <p className="text-xs text-[#191c1d]/45">หน้านี้แสดงเฉพาะข้อมูลการให้คะแนนของอาจารย์ที่กำลังเข้าสู่ระบบอยู่เท่านั้น</p>
              </div>

              {loading && <div className="py-10 text-center text-sm text-[#191c1d]/40 animate-pulse">กำลังโหลดข้อมูล...</div>}
              {!loading && rows.length === 0 && !error && <div className="py-10 text-center text-sm text-[#191c1d]/40">อาจารย์ท่านนี้ยังไม่มีรายการประเมิน</div>}

              {!loading && rows.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="text-sm w-full border-collapse">
                    <thead>
                      <tr className="text-left text-[#191c1d]/50 border-b">
                        <th className="pb-2 pr-3 font-semibold">เวลา</th>
                        <th className="pb-2 pr-3 font-semibold">นักศึกษา</th>
                        <th className="pb-2 pr-3 font-semibold">ประเภท</th>
                        <th className="pb-2 pr-3 font-semibold">สถานที่</th>
                        <th className="pb-2 pr-3 font-semibold text-right">คะแนน</th>
                        <th className="pb-2 font-semibold text-right">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => (
                        <tr key={`${row.timestamp}-${row.studentId}-${index}`} className="border-b border-[#f8f8f8] last:border-0 hover:bg-[#fafafa]">
                          <td className="py-2 pr-3 text-[#191c1d]/40 whitespace-nowrap">{new Date(row.timestamp).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}</td>
                          <td className="py-2 pr-3">
                            <div className="font-medium">{row.studentName}</div>
                            <div className="text-xs text-[#191c1d]/45">{row.studentId}</div>
                          </td>
                          <td className="py-2 pr-3 text-[#191c1d]/60">{row.categoryTitle}</td>
                          <td className="py-2 pr-3 text-[#191c1d]/60">{row.workplace}</td>
                          <td className="py-2 pr-3 text-right tabular-nums font-semibold">{row.totalScore}/{row.maxScore}</td>
                          <td className="py-2 text-right tabular-nums font-semibold">{row.pct.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
