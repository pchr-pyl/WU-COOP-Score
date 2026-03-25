"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, Edit, Home, RefreshCw, Save, UserRound, Users, X } from "lucide-react";
import type { DashboardData, ScoreRow } from "@/lib/score-store/types";
import { JUDGE_SESSION_STORAGE_KEY, type JudgeRecord } from "@/lib/judge-session";
import { CATEGORY_CONFIG } from "@/lib/assessment-config";

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
  const averageScore = uniqueStudents.size > 0 ? totalScore / uniqueStudents.size : 0;
  
  // ดึงข้อมูลทั้งหมดเพื่อคำนวณจำนวนกรรมการที่ร่วมประเมิน
  const allJudgesCount = data?.rows ? new Set(data.rows.map(row => row.judgeId)).size : 0;

  // ดึงข้อมูลคะแนนรายข้อจาก Supabase
  const [detailedScores, setDetailedScores] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedStudentDetails, setSelectedStudentDetails] = useState<any>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedScores, setEditedScores] = useState<Record<string, number>>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  // ESC key and click outside handlers for popup
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showPopup) {
        setShowPopup(false);
        setIsEditMode(false);
        setEditedScores({});
        setUpdateMessage(null);
      }
    };
    
    const handleClickOutside = (e: MouseEvent) => {
      if (showPopup) {
        const target = e.target as HTMLElement;
        if (target.classList.contains('fixed') && target.classList.contains('inset-0')) {
          setShowPopup(false);
          setIsEditMode(false);
          setEditedScores({});
          setUpdateMessage(null);
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

  const fetchDetailedScores = async () => {
    if (!judge) return;
    
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/dashboard?judgeId=${judge.id}&includeScores=true`);
      if (res.ok) {
        const data = await res.json();
        setDetailedScores(data.detailedScores || []);
      }
    } catch (error) {
      console.error('Failed to fetch detailed scores:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchDetailedScores();
  }, [judge]);

  // ฟังก์ชันเริ่มโหมดแก้ไข
  const startEditMode = () => {
    if (!selectedStudentDetails || !selectedStudentDetails.scores) return;
    
    setIsEditMode(true);
    setEditedScores({ ...selectedStudentDetails.scores });
    setUpdateMessage(null);
  };

  // ฟังก์ชันยกเลิกการแก้ไข
  const cancelEdit = () => {
    setIsEditMode(false);
    setEditedScores({});
    setUpdateMessage(null);
  };

  // ฟังก์ชันอัปเดตคะแนน
  const updateScores = async () => {
    if (!selectedStudentDetails || !judge) return;

    setIsUpdating(true);
    setUpdateMessage(null);

    try {
      // หาข้อมูลประเมินเดิมจาก dashboard
      const existingRow = data?.rows.find(row => 
        row.studentId === selectedStudentDetails.student_id && 
        row.category === selectedStudentDetails.category &&
        row.judgeId === judge.id
      );

      if (!existingRow) {
        throw new Error("ไม่พบข้อมูลการประเมินเดิม");
      }

      // คำนวณคะแนนรวมใหม่
      const newTotalScore = Object.values(editedScores).reduce((sum, score) => sum + score, 0);
      const maxScore = existingRow.maxScore;

      // ส่งข้อมูลไปอัปเดต
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category: selectedStudentDetails.category,
          categoryTitle: existingRow.categoryTitle,
          student: {
            id: selectedStudentDetails.student_id,
            name: selectedStudentDetails.student_name,
            program: "",
            school: "",
            workplace: existingRow.workplace || "",
            project: "",
          },
          judge: {
            id: judge.id,
            name: judge.name,
            dept: judge.dept,
          },
          scores: editedScores,
          totalScore: newTotalScore,
          maxScore,
          isEdit: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "อัปเดตคะแนนไม่สำเร็จ");
      }

      // อัปเดตข้อมูลใน popup
      setSelectedStudentDetails((prev: any) => ({
        ...prev,
        scores: editedScores
      }));

      // รีเฟรชข้อมูล dashboard
      await fetchData();
      
      setUpdateMessage("อัปเดตคะแนนสำเร็จแล้ว");
      setIsEditMode(false);
      setEditedScores({});

      // ปิด popup หลังจาก 2 วินาที
      setTimeout(() => {
        setShowPopup(false);
        setUpdateMessage(null);
      }, 2000);

    } catch (error) {
      setUpdateMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัปเดตคะแนน");
    } finally {
      setIsUpdating(false);
    }
  };

  // ฟังก์ชันจัดการการเปลี่ยนคะแนน
  const handleScoreChange = (questionId: string, value: string, max: number) => {
    const numericValue = Math.min(Math.max(0, Number.parseFloat(value) || 0), max);
    setEditedScores(prev => ({ ...prev, [questionId]: numericValue }));
  };

  return (
    <main className="min-h-screen bg-[#f8f9fa] text-[#191c1d] leading-[1.75]">
      <div className="fixed top-0 left-0 h-1 w-full bg-gradient-to-r from-[#9f4200] to-[#fe6c00] z-50" />
      <div className="sticky top-0 bg-[#f8f9fa] z-20 px-4 py-4 backdrop-blur-sm border-b border-gray-200">
        <div className="mx-auto max-w-6xl">
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
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:px-10 space-y-6">
        {!judge && (
          <div className="bg-white rounded-2xl px-5 py-8 shadow-[0_8px_24px_rgba(25,28,29,0.06)] text-center text-[#191c1d]/60">
            ยังไม่มีข้อมูลกรรมการในเครื่องนี้ กรุณากลับไปที่หน้าแรกเพื่อกรอก password ของอาจารย์ก่อน
          </div>
        )}

        {judge && (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-2xl px-4 py-4 sm:px-5 sm:py-5 shadow-[0_8px_24px_rgba(25,28,29,0.06)] flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#f3f4f5] flex items-center justify-center shrink-0"><ClipboardList size={20} className="text-[#9f4200]" /></div>
                <div>
                  <p className="text-[10px] sm:text-xs uppercase tracking-widest text-[#191c1d]/45 font-semibold">จำนวนครั้งที่ประเมิน</p>
                  <p className="text-xl sm:text-2xl font-bold tracking-tight">{rows.length}</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl px-4 py-4 sm:px-5 sm:py-5 shadow-[0_8px_24px_rgba(25,28,29,0.06)] flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#f3f4f5] flex items-center justify-center shrink-0"><UserRound size={20} className="text-[#9f4200]" /></div>
                <div>
                  <p className="text-[10px] sm:text-xs uppercase tracking-widest text-[#191c1d]/45 font-semibold">นักศึกษาที่ประเมินแล้ว</p>
                  <p className="text-xl sm:text-2xl font-bold tracking-tight">{uniqueStudents.size}</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl px-4 py-4 sm:px-5 sm:py-5 shadow-[0_8px_24px_rgba(25,28,29,0.06)] flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#f3f4f5] flex items-center justify-center shrink-0"><Users size={20} className="text-[#5f00e3]" /></div>
                <div>
                  <p className="text-[10px] sm:text-xs uppercase tracking-widest text-[#191c1d]/45 font-semibold">กรรมการร่วมประเมิน</p>
                  <p className="text-xl sm:text-2xl font-bold tracking-tight">{allJudgesCount}</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl px-4 py-4 sm:px-5 sm:py-5 shadow-[0_8px_24px_rgba(25,28,29,0.06)] flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#f3f4f5] flex items-center justify-center shrink-0"><ClipboardList size={20} className="text-[#9f4200]" /></div>
                <div>
                  <p className="text-[10px] sm:text-xs uppercase tracking-widest text-[#191c1d]/45 font-semibold">คะแนนเฉลี่ยต่อคน</p>
                  <p className="text-xl sm:text-2xl font-bold tracking-tight">{averageScore.toFixed(2)}</p>
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
                  <table className="text-xs w-full border-collapse">
                    <thead className="sticky top-0 bg-white z-10 border-b border-[#f8f8f8]">
                      <tr>
                        <th className="pb-2 pr-3 font-semibold">เวลา</th>
                        <th className="pb-2 pr-3 font-semibold">นักศึกษา</th>
                        <th className="pb-2 pr-3 font-semibold">ประเภท</th>
                        <th className="pb-2 pr-3 font-semibold">สถานที่</th>
                        <th className="pb-2 pr-3 font-semibold text-right">คะแนน</th>
                        <th className="pb-2 font-semibold text-center">แก้ไข</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => (
                        <tr 
                          key={`${row.timestamp}-${row.studentId}-${index}`} 
                          className="border-b border-[#f8f8f8] last:border-0 hover:bg-[#fafafa] transition-colors"
                        >
                          <td className="py-2 pr-3 text-[#191c1d]/40 whitespace-nowrap">
                            <div>{new Date(row.timestamp).toLocaleString("th-TH", { dateStyle: "short" })}</div>
                            <div>{new Date(row.timestamp).toLocaleString("th-TH", { timeStyle: "short" })}</div>
                          </td>
                          <td className="py-2 pr-3">
                            <div className="font-medium text-left hover:text-[#5f00e3] transition-colors cursor-pointer"
                              onClick={() => {
                                const studentDetails = detailedScores.find(s => s.student_id === row.studentId && s.category === row.category);
                                if (studentDetails) {
                                  setSelectedStudentDetails(studentDetails);
                                  setShowPopup(true);
                                }
                              }}
                            >
                              {row.studentName}
                            </div>
                            <div className="text-xs text-[#191c1d]/45">{row.studentId}</div>
                          </td>
                          <td className="py-2 pr-3 text-[#191c1d]/60">{row.categoryTitle}</td>
                          <td className="py-2 pr-3 text-[#191c1d]/60">{row.workplace}</td>
                          <td className="py-2 pr-3 text-right tabular-nums font-semibold">{row.totalScore}/{row.maxScore}</td>
                          <td className="py-2 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const studentDetails = detailedScores.find(s => s.student_id === row.studentId && s.category === row.category);
                                if (studentDetails) {
                                  setSelectedStudentDetails(studentDetails);
                                  setIsEditMode(false);
                                  setShowPopup(true);
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded-full hover:bg-blue-600 transition-colors"
                            >
                              <Edit size={10} />
                              แก้ไข
                            </button>
                          </td>
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
    {/* Popup รายละเอียดคะแนนแต่ละข้อ */}
      {showPopup && selectedStudentDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl sm:rounded-3xl p-4 sm:p-8 max-w-3xl w-full max-h-[90vh] sm:max-h-[85vh] overflow-y-auto shadow-2xl border border-gray-200">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-gradient-to-br from-white to-gray-50 flex items-center justify-between pt-4 sm:pt-8 pb-4 sm:pb-6 mb-4 sm:mb-6 border-b border-gray-200 -mx-4 sm:-mx-8 px-4 sm:px-8">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#5f00e3]/10 to-[#7b3ff2]/10 rounded-xl flex items-center justify-center">
                  <span className="text-lg sm:text-lg font-bold text-[#5f00e3]">{selectedStudentDetails.student_name.charAt(0)}</span>
                </div>
                <div>
                  <h3 className="text-lg sm:text-2xl font-bold text-[#191c1d]">{selectedStudentDetails.student_name}</h3>
                  <p className="text-xs sm:text-sm text-gray-600">{selectedStudentDetails.student_id} • {selectedStudentDetails.category}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isEditMode ? (
                  <button
                    onClick={startEditMode}
                    className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-blue-500 text-white text-xs sm:text-sm font-medium rounded-full hover:bg-blue-600 transition-colors"
                  >
                    <Edit size={12} />
                    แก้ไขคะแนน
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={cancelEdit}
                      className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-gray-500 text-white text-xs sm:text-sm font-medium rounded-full hover:bg-gray-600 transition-colors"
                    >
                      <X size={12} />
                      ยกเลิก
                    </button>
                    <button
                      onClick={updateScores}
                      disabled={isUpdating}
                      className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-green-500 text-white text-xs sm:text-sm font-medium rounded-full hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      <Save size={12} />
                      {isUpdating ? "กำลังอัปเดต..." : "อัปเดตคะแนน"}
                    </button>
                  </div>
                )}
                <button
                  onClick={() => {
                    setShowPopup(false);
                    setIsEditMode(false);
                    setEditedScores({});
                    setUpdateMessage(null);
                  }}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all hover:scale-110"
                >
                  <span className="text-gray-600 text-lg sm:text-lg">×</span>
                </button>
              </div>
            </div>

            {/* Score Summary */}
            <div className="mb-6">
              <div className="bg-gradient-to-r from-[#f3f4f5] to-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">คะแนนรวม</span>
                  <span className="text-2xl font-bold text-[#9f4200]">
                    {Object.values(isEditMode ? editedScores : selectedStudentDetails.scores).reduce((sum: number, score: any) => sum + (score as number), 0).toFixed(2)}
                  </span>
                </div>
              </div>
              {updateMessage && (
                <div className={`mt-3 px-4 py-2 rounded-lg text-sm text-center ${
                  updateMessage.includes("สำเร็จ") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}>
                  {updateMessage}
                </div>
              )}
            </div>

            {/* Questions List by Topic */}
            {selectedStudentDetails.scores && typeof selectedStudentDetails.scores === 'object' && (
              <div className="space-y-6">
                {(() => {
                  const categoryConfig = CATEGORY_CONFIG[selectedStudentDetails.category as keyof typeof CATEGORY_CONFIG];
                  if (!categoryConfig) return null;
                  
                  return categoryConfig.topics.map((topic, topicIndex) => {
                    // หาข้อคำถามที่เกี่ยวข้องกับ topic นี้
                    const topicQuestions = topic.questions.filter(q => selectedStudentDetails.scores[q.id] !== undefined);
                    const currentScores = isEditMode ? editedScores : selectedStudentDetails.scores;
                    const topicScores = topicQuestions.map(q => ({
                      id: q.id,
                      text: q.text,
                      score: currentScores[q.id] as number,
                      max: q.max
                    }));
                    
                    const topicTotal = topicScores.reduce((sum, item) => sum + item.score, 0);
                    const topicMax = topicScores.reduce((sum, item) => sum + item.max, 0);
                    const topicPercentage = topicMax > 0 ? (topicTotal / topicMax) * 100 : 0;
                    
                    return (
                      <div key={topic.id} className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border border-gray-200">
                        {/* Topic Header */}
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-[#5f00e3]/10 to-[#7b3ff2]/10 rounded-xl flex items-center justify-center">
                              <span className="text-lg font-bold text-[#5f00e3]">{topicIndex + 1}</span>
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-[#191c1d]">{topic.title}</h3>
                              <div className="text-sm text-gray-500">{topicScores.length} ข้อ</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold text-[#9f4200]">{topicTotal}</span>
                              <span className="text-sm text-gray-400">/{topicMax}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{topicPercentage.toFixed(1)}%</div>
                          </div>
                        </div>
                        
                        {/* Questions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {topicScores.map((item) => {
                            // แยกหัวข้อและรายละเอียด
                            const parts = item.text.split(/ มีการ| โดย| และ| ทั้ง| อันเนื่องมาจาก| ที่นำไป| ซึ่ง| ผู้มี| 1\)|2\)/);
                            const questionText = parts[0]?.trim() || item.text;
                            const percentage = item.max > 0 ? (item.score / item.max) * 100 : 0;
                            
                            return (
                              <div key={item.id} className="bg-white rounded-xl p-4 border border-gray-100">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                                        <span className="text-xs font-bold text-gray-600">{item.id.split('_')[1]}</span>
                                      </div>
                                      <h4 className="text-sm font-semibold text-[#191c1d] leading-tight">{questionText}</h4>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                    {isEditMode ? (
                                      <div className="flex flex-col items-end gap-1">
                                        <input
                                          type="text"
                                          inputMode="decimal"
                                          pattern="[0-9]*\.?[0-9]{0,2}"
                                          min="0"
                                          max={item.max}
                                          step="0.01"
                                          value={editedScores[item.id] ?? ""}
                                          onChange={(e) => {
                                            const target = e.target as HTMLInputElement;
                                            let value = target.value;
                                            
                                            // อนุญาตเฉพาะตัวเลขและจุดทศนิยม
                                            const cleanValue = value.replace(/[^0-9.]/g, '');
                                            
                                            // จำกัดจุดทศนิยมไว้แค่จุดเดียว
                                            const parts = cleanValue.split('.');
                                            let finalValue = parts[0];
                                            
                                            // เพิ่มทศนิยมถ้ามี และจำกัด 2 ตำแหน่ง
                                            if (parts.length > 1 && parts[1] !== undefined) {
                                              finalValue += '.' + parts[1].slice(0, 2);
                                            }
                                            
                                            // ไม่ให้ขึ้นต้นด้วยจุดทศนิยม
                                            if (finalValue.startsWith('.')) {
                                              finalValue = '0' + finalValue;
                                            }
                                            
                                            target.value = finalValue;
                                            handleScoreChange(item.id, finalValue, item.max);
                                          }}
                                          className="w-16 text-sm font-bold text-center p-1 bg-[#f3f4f5] rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                                        />
                                        <span className="text-xs text-gray-400">/ {item.max}</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-baseline gap-1">
                                        <span className="text-lg font-bold text-[#9f4200]">{item.score}</span>
                                        <span className="text-xs text-gray-400">/{item.max}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
