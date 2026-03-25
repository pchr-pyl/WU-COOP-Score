"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, LogOut, ShieldCheck, UserRound } from "lucide-react";
import type { CategoryKey } from "@/lib/assessment-config";
import {
  CATEGORY_META,
  JUDGE_SESSION_STORAGE_KEY,
  type JudgeRecord,
} from "@/lib/judge-session";

export default function HomeLoginClient() {
  const router = useRouter();
  const [judges, setJudges] = useState<JudgeRecord[]>([]);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeJudge, setActiveJudge] = useState<JudgeRecord | null>(null);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const res = await fetch("/judges.json", { cache: "no-store" });
        if (!res.ok) {
          throw new Error("โหลดข้อมูลกรรมการไม่สำเร็จ");
        }
        const all = (await res.json()) as JudgeRecord[];
        if (!alive) return;
        setJudges(all);

        const stored = window.localStorage.getItem(JUDGE_SESSION_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as JudgeRecord;
          const matched = all.find((judge) => judge.id === parsed.id && judge.password === parsed.password);
          if (matched) {
            setActiveJudge(matched);
          } else {
            window.localStorage.removeItem(JUDGE_SESSION_STORAGE_KEY);
          }
        }
      } catch (loadError) {
        if (!alive) return;
        setError(loadError instanceof Error ? loadError.message : "เกิดข้อผิดพลาดในการโหลดข้อมูลกรรมการ");
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();

    return () => {
      alive = false;
    };
  }, []);

  const allowedCategories = useMemo<CategoryKey[]>(() => activeJudge?.categories ?? [], [activeJudge]);

  const handleLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const judge = judges.find((item) => item.password === password.trim());

    if (!judge) {
      setError("ไม่พบ password นี้ในระบบ");
      return;
    }

    window.localStorage.setItem(JUDGE_SESSION_STORAGE_KEY, JSON.stringify(judge));
    setActiveJudge(judge);
    setError(null);
  };

  const handleLogout = () => {
    window.localStorage.removeItem(JUDGE_SESSION_STORAGE_KEY);
    setActiveJudge(null);
    setPassword("");
    setShowPassword(false);
    setError(null);
  };

  return (
    <main className="relative min-h-screen bg-[#f8f9fa] text-[#191c1d] px-4 py-10 sm:px-5 sm:py-12 md:px-8 md:py-20 leading-[1.75] overflow-hidden">
      <div className="fixed top-0 left-0 h-1 w-full bg-gradient-to-r from-[#9f4200] to-[#fe6c00]" />
      <div className="pointer-events-none absolute -top-24 -left-16 w-80 h-80 rounded-full bg-[#5f00e3]/6 blur-3xl" />
      <div className="pointer-events-none absolute bottom-8 right-0 w-96 h-96 rounded-full bg-[#fe6c00]/8 blur-3xl" />

      <div className="relative mx-auto max-w-6xl space-y-8 md:space-y-10">
        <header className="bg-white/80 backdrop-blur-xl rounded-[1.5rem] md:rounded-[1.75rem] px-4 py-6 sm:px-6 sm:py-7 md:px-10 md:py-10 shadow-[0_20px_40px_rgba(25,28,29,0.04)]">
          <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-5 sm:gap-7 md:gap-10 items-center">
            <Image
              src="/branding/coop-logo.png"
              alt="COOP Walailak University"
              className="w-20 sm:w-24 md:w-36 h-auto object-contain mx-auto md:mx-0"
              width={144}
              height={144}
              priority
            />

            <div className="space-y-2 sm:space-y-3 text-center md:text-left">
              <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] sm:tracking-[0.26em] text-[#5f00e3]/60 font-semibold">WU COOP SCORE 2026</p>
              <h1 className="text-xl sm:text-2xl md:text-5xl font-bold tracking-tight">ระบุตัวตนกรรมการผู้ประเมิน</h1>
              <p className="text-sm sm:text-base md:text-lg text-[#191c1d]/75">กรอก password ของอาจารย์ก่อนเลือกประเภทการประเมิน</p>
              <p className="text-[11px] sm:text-xs md:text-sm tracking-[0.04em] sm:tracking-[0.08em] uppercase text-[#191c1d]/45 break-words">THE CENTER FOR COOPERATIVE EDUCATION AND CAREER DEVELOPMENT WALAILAK UNIVERSITY</p>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[420px_1fr] items-start">
          <div className="bg-white rounded-[1.5rem] p-4 sm:p-6 md:p-8 shadow-[0_20px_40px_rgba(25,28,29,0.04)] space-y-5">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.22em] text-[#5f00e3]/60 font-semibold">Judge Login</p>
              <h2 className="text-2xl font-bold tracking-tight">เข้าสู่ระบบกรรมการ</h2>
            </div>

            {loading ? (
              <div className="rounded-2xl bg-[#f3f4f5] px-4 py-5 text-sm text-[#191c1d]/60">กำลังโหลดรายชื่อกรรมการ...</div>
            ) : activeJudge ? (
              <div className="space-y-4">
                <div className="rounded-[1.25rem] bg-[#f3f4f5] px-5 py-5 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shrink-0">
                      <ShieldCheck className="text-[#5f00e3]" size={22} />
                    </div>
                    <div>
                      <p className="font-bold text-lg leading-tight">{activeJudge.name}</p>
                      <p className="text-sm text-[#191c1d]/55">{activeJudge.dept}</p>
                    </div>
                  </div>
                  <p className="text-xs text-[#191c1d]/50">เข้าสู่ระบบด้วย password ของอาจารย์เรียบร้อยแล้ว</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/judge-summary" className="flex-1 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 bg-[#191c1d] text-white font-medium hover:bg-black transition-colors">
                    <UserRound size={18} /> ดูสรุปของอาจารย์
                  </Link>
                  <button onClick={handleLogout} className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 border border-[#5f00e3]/20 text-[#5f00e3] font-medium hover:bg-[#5f00e3]/5 transition-colors">
                    <LogOut size={18} /> ออกจากระบบ
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <label className="block space-y-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-[#191c1d]/45 font-semibold">Password</span>
                  <div className="flex items-center gap-3 rounded-2xl bg-[#f3f4f5] px-4 py-3">
                    <KeyRound size={18} className="text-[#5f00e3]" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="เช่น j001"
                      className="w-full bg-transparent outline-none text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="shrink-0 text-[#5f00e3] hover:text-[#3d00a0] transition-colors"
                      aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>

                {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

                <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 bg-gradient-to-br from-[#9f4200] to-[#fe6c00] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                  <ShieldCheck size={18} /> ยืนยันตัวตนกรรมการ
                </button>
              </form>
            )}
          </div>

          <div className="space-y-5">
            <div className="bg-white rounded-[1.5rem] p-4 sm:p-6 md:p-8 shadow-[0_20px_40px_rgba(25,28,29,0.04)]">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[#5f00e3]/60 font-semibold">Allowed Categories</p>
                  <h2 className="text-lg sm:text-2xl font-bold tracking-tight">ประเภทที่กรรมการมีสิทธิ์ประเมิน</h2>
                </div>
              </div>

              {!activeJudge ? (
                <div className="mt-5 rounded-[1.25rem] border border-dashed border-[#191c1d]/12 px-4 sm:px-5 py-6 sm:py-8 text-sm text-[#191c1d]/50">เมื่อยืนยันตัวตนแล้ว ระบบจะแสดงเฉพาะประเภทที่อาจารย์ท่านนี้มีสิทธิ์ประเมิน</div>
              ) : (
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                  {allowedCategories.map((category) => (
                    <button
                      key={category}
                      onClick={() => router.push(CATEGORY_META[category].href)}
                      className="text-left rounded-[1.25rem] bg-[#f3f4f5] px-4 sm:px-5 py-4 sm:py-5 hover:bg-gradient-to-br hover:from-[#9f4200] hover:to-[#fe6c00] hover:text-white transition-all duration-300"
                    >
                      <p className="text-[11px] uppercase tracking-[0.22em] opacity-50">Path {CATEGORY_META[category].href}</p>
                      <p className="text-lg sm:text-xl font-bold mt-3 leading-tight">{CATEGORY_META[category].title}</p>
                      <p className="text-sm opacity-70 mt-1">{CATEGORY_META[category].subtitle}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-[1.5rem] p-6 md:p-8 shadow-[0_20px_40px_rgba(25,28,29,0.04)] text-sm text-[#191c1d]/65 space-y-3">
              <p className="font-semibold text-[#191c1d]">วิธีการใช้งาน</p>
              <p>1. กรรมการกรอก password เพื่อเข้าสู่ระบบ</p>
              <p>2. ระบบจะแสดงเฉพาะประเภทที่กรรมการท่านนั้นมีสิทธิ์ประเมิน</p>
              <p>3. เลือกประเภท จากนั้นเลือกนักศึกษา และให้คะแนนตามแบบประเมิน</p>
              <p>4. เมื่อต้องการตรวจสอบย้อนหลัง สามารถกดปุ่ม "ดูสรุปของอาจารย์" เพื่อดูรายการที่ประเมินแล้วได้</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
