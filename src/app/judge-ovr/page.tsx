"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { RefreshCw, Trophy, Users, ClipboardList, TrendingUp, User, CheckCircle, Clock, Filter, X, BookOpen, Building2 } from "lucide-react";

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

type Judge = {
  id: string;
  name: string;
  dept: string;
  password: string;
  categories: string[];
};

type Student = {
  id: string;
  name: string;
  program: string;
  school: string;
  workplace: string;
  project: string;
  category: string;
};

type JudgeStats = {
  judge: Judge;
  totalEvaluations: number;
  categoriesEvaluated: Record<string, number>;
  studentsEvaluated: string[];
  lastEvaluation?: string;
};

export default function JudgeOverviewPage() {
  const [judges, setJudges] = useState<Judge[]>([]);
  const [judgeStats, setJudgeStats] = useState<JudgeStats[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedJudge, setSelectedJudge] = useState<Judge | null>(null);
  const [popupLoading, setPopupLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Load judges data
      const judgesRes = await fetch("/judges.json", { cache: "no-store" });
      if (!judgesRes.ok) throw new Error("โหลดข้อมูลกรรมการไม่สำเร็จ");
      const judgesData: Judge[] = await judgesRes.json();
      setJudges(judgesData);

      // Load students data
      const studentsRes = await fetch("/students.json", { cache: "no-store" });
      if (!studentsRes.ok) throw new Error("โหลดข้อมูลนักศึกษาไม่สำเร็จ");
      const studentsData: Student[] = await studentsRes.json();
      setStudents(studentsData);

      // Load dashboard data for stats
      const dashboardRes = await fetch("/api/dashboard", { cache: "no-store" });
      if (dashboardRes.ok) {
        const dashboardData = await dashboardRes.json();
        
        // Calculate stats for each judge
        const stats: JudgeStats[] = judgesData.map(judge => {
          const evaluations = dashboardData.rows.filter((row: any) => row.judgeId === judge.id);
          const categoriesEvaluated: Record<string, number> = {};
          const studentsEvaluated = new Set<string>();
          
          evaluations.forEach((evaluation: any) => {
            categoriesEvaluated[evaluation.category] = (categoriesEvaluated[evaluation.category] || 0) + 1;
            studentsEvaluated.add(evaluation.studentId);
          });

          return {
            judge,
            totalEvaluations: evaluations.length,
            categoriesEvaluated,
            studentsEvaluated: Array.from(studentsEvaluated),
            lastEvaluation: evaluations.length > 0 ? evaluations[evaluations.length - 1].timestamp : undefined
          };
        });

        setJudgeStats(stats);
      }
      
      setLastRefresh(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ESC key and click outside handlers for popup
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showPopup) {
        setShowPopup(false);
        setSelectedJudge(null);
      }
    };
    
    const handleClickOutside = (e: MouseEvent) => {
      if (showPopup) {
        const target = e.target as HTMLElement;
        if (target.classList.contains('fixed') && target.classList.contains('inset-0')) {
          setShowPopup(false);
          setSelectedJudge(null);
        }
      }
    };
    
    if (showPopup) {
      document.addEventListener('keydown', handleEsc);
      document.addEventListener('click', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showPopup]);

  // Function to handle judge card click
  const handleJudgeClick = (judge: Judge) => {
    setSelectedJudge(judge);
    setShowPopup(true);
  };

  // Function to get students for a specific judge
  const getStudentsForJudge = (judge: Judge) => {
    return students.filter(student => judge.categories.includes(student.category));
  };

  // Function to check if a student has been evaluated by a judge
  const isStudentEvaluatedByJudge = (studentId: string, judgeId: string) => {
    const stat = judgeStats.find(s => s.judge.id === judgeId);
    return stat?.studentsEvaluated.includes(studentId) || false;
  };

  // Filter judges by category
  const filteredJudges = activeCategory === "all" 
    ? judgeStats 
    : judgeStats.filter(stat => 
        stat.judge.categories.includes(activeCategory) || 
        stat.categoriesEvaluated[activeCategory] > 0
      );

  const totalJudges = judges.length;
  const judgesWithEvaluations = judgeStats.filter(stat => stat.totalEvaluations > 0).length;

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
                ภาพรวมกรรมการผู้ประเมิน
              </h1>
              {lastRefresh && (
                <p className="text-sm text-[#191c1d]/60 mt-2">
                  อัปเดตล่าสุด {lastRefresh.toLocaleTimeString("th-TH")}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-md text-sm font-medium hover:bg-[#f3f4f5] transition-all hover:shadow-lg"
              >
                <Trophy size={16} /> คะแนน
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
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl px-4 py-4 sm:px-6 sm:py-6 shadow-[0_8px_24px_rgba(25,28,29,0.06)] flex items-center gap-3 sm:gap-4 hover:shadow-lg transition-all">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#f3f4f5] to-[#e8e9ea] flex items-center justify-center shrink-0">
              <Users size={20} className="text-[#9f4200]" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] sm:text-xs uppercase tracking-widest text-[#191c1d]/45 font-semibold">กรรมการทั้งหมด</p>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight">{totalJudges}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl px-4 py-4 sm:px-6 sm:py-6 shadow-[0_8px_24px_rgba(25,28,29,0.06)] flex items-center gap-3 sm:gap-4 hover:shadow-lg transition-all">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#f3f4f5] to-[#e8e9ea] flex items-center justify-center shrink-0">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] sm:text-xs uppercase tracking-widest text-[#191c1d]/45 font-semibold">ที่ประเมินแล้ว</p>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight text-green-600">{judgesWithEvaluations}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl px-4 py-4 sm:px-6 sm:py-6 shadow-[0_8px_24px_rgba(25,28,29,0.06)] flex items-center gap-3 sm:gap-4 hover:shadow-lg transition-all">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#f3f4f5] to-[#e8e9ea] flex items-center justify-center shrink-0">
              <Clock size={20} className="text-[#5f00e3]" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] sm:text-xs uppercase tracking-widest text-[#191c1d]/45 font-semibold">รอประเมิน</p>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight text-orange-600">{totalJudges - judgesWithEvaluations}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl px-4 py-4 sm:px-6 sm:py-6 shadow-[0_8px_24px_rgba(25,28,29,0.06)] flex items-center gap-3 sm:gap-4 hover:shadow-lg transition-all">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#f3f4f5] to-[#e8e9ea] flex items-center justify-center shrink-0">
              <ClipboardList size={20} className="text-[#9f4200]" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] sm:text-xs uppercase tracking-widest text-[#191c1d]/45 font-semibold">รายการประเมิน</p>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight">{judgeStats.reduce((sum, stat) => sum + stat.totalEvaluations, 0)}</p>
            </div>
          </div>
        </div>

        {/* Category filter */}
        <div className="bg-white rounded-2xl px-6 py-6 shadow-[0_8px_24px_rgba(25,28,29,0.06)]">
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <div>
              <h2 className="text-lg font-bold">รายชื่อกรรมการผู้ประเมิน</h2>
              <p className="text-sm text-[#191c1d]/60">กรองตามประเภทที่มีสิทธิ์ประเมิน</p>
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

          {!loading && filteredJudges.length === 0 && !error && (
            <div className="py-16 text-center">
              <div className="inline-flex flex-col items-center gap-3 px-6 py-8 bg-[#f3f4f5] rounded-2xl">
                <div className="w-12 h-12 bg-[#e8e9ea] rounded-full flex items-center justify-center">
                  <Users size={20} className="text-[#191c1c]/50" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#191c1c]">ไม่พบกรรมการในหมวดนี้</p>
                  <p className="text-xs text-[#191c1d]/50">ลองเลือกหมวดอื่น</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {filteredJudges.map((stat) => (
              <div 
                key={stat.judge.id} 
                className="group bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer hover:border-[#5f00e3]/30"
                onClick={() => handleJudgeClick(stat.judge)}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
                  {/* Judge Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5f00e3]/10 to-[#7b3ff2]/10 flex items-center justify-center">
                        <User size={20} className="text-[#5f00e3]" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-[#191c1d]">{stat.judge.name}</h3>
                        <p className="text-xs sm:text-sm text-gray-600">{stat.judge.dept}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-2">หมวดที่มีสิทธิ์ประเมิน</div>
                        <div className="flex flex-wrap gap-2">
                          {stat.judge.categories.map((cat) => (
                            <span
                              key={cat}
                              className="px-2 py-1 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: `${CATEGORY_COLORS[cat]}20`,
                                color: CATEGORY_COLORS[cat],
                              }}
                            >
                              {CATEGORY_LABELS[cat] || cat}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-2">สถานะการประเมิน</div>
                        <div className="flex items-center gap-2">
                          {stat.totalEvaluations > 0 ? (
                            <>
                              <CheckCircle size={16} className="text-green-600" />
                              <span className="text-sm font-medium text-green-600">
                                ประเมินแล้ว {stat.totalEvaluations} คน
                              </span>
                            </>
                          ) : (
                            <>
                              <Clock size={16} className="text-orange-600" />
                              <span className="text-sm font-medium text-orange-600">ยังไม่ได้ประเมิน</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {stat.totalEvaluations > 0 && (
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-2">รายละเอียดการประเมิน</div>
                        <div className="flex flex-wrap gap-3">
                          {Object.entries(stat.categoriesEvaluated).map(([cat, count]) => (
                            <div key={cat} className="flex items-center gap-2 text-xs">
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                              />
                              <span>{CATEGORY_LABELS[cat] || cat}: {count} คน</span>
                            </div>
                          ))}
                        </div>
                        {stat.lastEvaluation && (
                          <p className="text-xs text-gray-500 mt-2">
                            ประเมินล่าสุด: <br />
                            {new Date(stat.lastEvaluation).toLocaleString("th-TH", { dateStyle: "short" })}<br />
                            {new Date(stat.lastEvaluation).toLocaleString("th-TH", { timeStyle: "short" })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0 sm:mt-0 mt-4">
                    <div className="text-right">
                      <div className="text-xl sm:text-2xl font-bold tabular-nums text-[#9f4200]">{stat.totalEvaluations}</div>
                      <div className="text-xs text-gray-500">รายการ</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Judge Details Popup */}
        {showPopup && selectedJudge && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 max-w-4xl w-full max-h-[90vh] sm:max-h-[85vh] overflow-y-auto shadow-2xl border border-gray-200">
              {/* Header */}
              <div className="sticky top-0 z-10 bg-white flex items-center justify-between pt-4 sm:pt-8 pb-4 sm:pb-6 mb-4 sm:mb-6 border-b border-gray-200 -mx-4 sm:-mx-8 px-4 sm:px-8">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#5f00e3]/10 to-[#7b3ff2]/10 rounded-xl flex items-center justify-center">
                    <User size={20} className="text-[#5f00e3]" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-2xl font-bold text-[#191c1d]">{selectedJudge.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-600">{selectedJudge.dept}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowPopup(false);
                    setSelectedJudge(null);
                  }}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all hover:scale-110"
                >
                  <X size={16} className="text-gray-600" />
                </button>
              </div>

              {/* Students List */}
              <div className="space-y-4 sm:space-y-6">
                {/* Summary */}
                <div className="bg-gray-50 rounded-2xl p-4 sm:p-6 border border-gray-200">
                  <h5 className="font-semibold text-[#191c1d] mb-3 sm:mb-4 text-base sm:text-lg">สรุปสถานะการประเมิน</h5>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="text-center">
                      <div className="text-xl sm:text-2xl font-bold text-green-600">
                        {getStudentsForJudge(selectedJudge).filter(s => isStudentEvaluatedByJudge(s.id, selectedJudge.id)).length}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">ประเมินแล้ว</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl sm:text-2xl font-bold text-orange-600">
                        {getStudentsForJudge(selectedJudge).filter(s => !isStudentEvaluatedByJudge(s.id, selectedJudge.id)).length}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">ยังไม่ได้ประเมิน</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-base sm:text-lg font-semibold text-[#191c1d] mb-3 sm:mb-4">รายชื่อนักศึกษาที่ต้องประเมิน</h4>
                  <div className="space-y-2 sm:space-y-3">
                    {getStudentsForJudge(selectedJudge).map((student) => {
                      const isEvaluated = isStudentEvaluatedByJudge(student.id, selectedJudge.id);
                      return (
                        <div
                          key={student.id}
                          className={`border rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all ${
                            isEvaluated
                              ? 'bg-green-50 border-green-200'
                              : 'bg-orange-50 border-orange-200'
                          }`}
                        >
                          <div className="flex items-start gap-3 sm:gap-4">
                            <div className="flex-shrink-0">
                              {isEvaluated ? (
                                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-500 rounded-full flex items-center justify-center">
                                  <CheckCircle size={12} className="text-white sm:size-16" />
                                </div>
                              ) : (
                                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-500 rounded-full flex items-center justify-center">
                                  <Clock size={12} className="text-white sm:size-16" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                                <h5 className="font-semibold text-[#191c1d] text-sm sm:text-base">{student.name}</h5>
                                <span className="text-xs text-gray-500">ID: {student.id}</span>
                                <span
                                  className="px-2 py-1 rounded-full text-xs font-medium inline-block"
                                  style={{
                                    backgroundColor: `${CATEGORY_COLORS[student.category]}20`,
                                    color: CATEGORY_COLORS[student.category],
                                  }}
                                >
                                  {CATEGORY_LABELS[student.category] || student.category}
                                </span>
                              </div>
                              <div className="space-y-1 text-xs sm:text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <BookOpen size={12} className="text-gray-400 sm:size-14" />
                                  <span>{student.program} · {student.school}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Building2 size={12} className="text-gray-400 sm:size-14" />
                                  <span>{student.workplace}</span>
                                </div>
                                <div className="text-xs italic text-gray-500 mt-1">{student.project}</div>
                              </div>
                              <div className="mt-2 sm:mt-3">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                                    isEvaluated
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-orange-100 text-orange-700'
                                  }`}
                                >
                                  {isEvaluated ? (
                                    <>
                                      <CheckCircle size={10} />
                                      ประเมินแล้ว
                                    </>
                                  ) : (
                                    <>
                                      <Clock size={10} />
                                      ยังไม่ได้ประเมิน
                                    </>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
