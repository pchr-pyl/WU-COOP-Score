"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  LayoutGrid,
  Send,
  User,
} from "lucide-react";
import { CategoryConfig, CategoryKey } from "@/lib/assessment-config";

type Judge = {
  id: string;
  name: string;
  dept: string;
  categories: CategoryKey[];
};

type Student = {
  id: string;
  name: string;
  program: string;
  school: string;
  phone: string;
  lineId: string;
  workplace: string;
  project: string;
  thaiCategory: string;
  category: CategoryKey | "unknown";
};

type Props = {
  config: CategoryConfig;
};

export default function CategoryAssessmentClient({ config }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingJudges, setLoadingJudges] = useState(true);
  const [step, setStep] = useState(0);
  const [selectedJudge, setSelectedJudge] = useState<Judge | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [completedSubmissions, setCompletedSubmissions] = useState<Map<string, { total: number; max: number }>>(new Map());

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const res = await fetch("/students.json", { cache: "no-store" });
        if (!res.ok) {
          throw new Error("โหลดรายชื่อนักศึกษาไม่สำเร็จ");
        }
        const all: Student[] = await res.json();
        if (!alive) return;
        setStudents(all.filter((s) => s.category === config.key));
      } catch {
        if (!alive) return;
        setStudents([]);
      } finally {
        if (alive) setLoadingStudents(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [config.key]);

  // ดึงข้อมูลการประเมินของกรรมการคนนี้จาก dashboard
  useEffect(() => {
    if (!selectedJudge) {
      setCompletedSubmissions(new Map());
      return;
    }
    let alive = true;
    const run = async () => {
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) return;

        const data = await res.json();
        if (!alive) return;

        // สร้าง Map ของนักศึกษาที่ถูกประเมินแล้วโดยกรรมการคนนี้เท่านั้น
        const completed = new Map<string, { total: number; max: number }>();
        data.rows?.forEach((row: any) => {
          if (row.category === config.key && row.judgeId === selectedJudge.id) {
            completed.set(row.studentId, {
              total: Number(row.totalScore),
              max: Number(row.maxScore),
            });
          }
        });

        setCompletedSubmissions(completed);
      } catch {
        // ไม่ต้องทำอะไร ถ้าดึงข้อมูลไม่ได้
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [config.key, selectedJudge]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const res = await fetch("/judges.json", { cache: "force-cache" });
        if (!res.ok) {
          throw new Error("โหลดรายชื่อกรรมการไม่สำเร็จ");
        }
        const all: Judge[] = await res.json();
        if (!alive) return;
        setJudges(all);
      } catch {
        if (!alive) return;
        setJudges([]);
      } finally {
        if (alive) setLoadingJudges(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, []);

  const availableJudges = useMemo(
    () => judges.filter((judge) => judge.categories.includes(config.key)),
    [judges, config.key],
  );

  const totalSteps = config.topics.length + 3;
  const summaryStep = totalSteps - 1;
  const topicStartStep = 2;
  const topicEndStep = summaryStep - 1;
  const progress = (step / (totalSteps - 1)) * 100;

  const handleScoreChange = (qId: string, val: string, max: number) => {
    // อนุญาตให้เป็นค่าว่างหรือตัวเลขทศนิยม
    if (val === "") {
      setScores((prev) => ({ ...prev, [qId]: 0 }));
      return;
    }
    
    const numVal = Number.parseFloat(val);
    if (!Number.isNaN(numVal)) {
      // จำกัดค่าระหว่าง 0 ถึง max
      const clampedVal = Math.min(Math.max(0, numVal), max);
      setScores((prev) => ({ ...prev, [qId]: clampedVal }));
    }
  };

  const calculateTopicTotal = (topicIndex: number) => {
    const topic = config.topics[topicIndex];
    const total = topic.questions.reduce((sum, q) => sum + (scores[q.id] || 0), 0);
    // ปัดเศษเป็น 2 ตำแหน่ง
    return Math.round(total * 100) / 100;
  };

  const calculateTopicMax = (topicIndex: number) => {
    const topic = config.topics[topicIndex];
    return topic.questions.reduce((sum, q) => sum + q.max, 0);
  };

  const maxScore = useMemo(
    () =>
      config.topics.reduce(
        (sum, topic) => sum + topic.questions.reduce((topicSum, q) => topicSum + q.max, 0),
        0,
      ),
    [config.topics],
  );

  const isTopicCompleted = (topicIndex: number) => {
    const topic = config.topics[topicIndex];
    return topic.questions.every((q) => scores[q.id] !== undefined);
  };

  const grandTotal = useMemo(() => {
    const total = Object.values(scores).reduce((sum, val) => sum + (Number(val) || 0), 0);
    // ปัดเศษเป็น 2 ตำแหน่ง
    return Math.round(total * 100) / 100;
  }, [scores]);

  const handleSubmit = async () => {
    if (!selectedStudent || !selectedJudge) {
      setSubmitMessage("กรุณาเลือกกรรมการและนักศึกษาก่อนส่งคะแนน");
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category: config.key,
          categoryTitle: config.title,
          student: {
            id: selectedStudent.id,
            name: selectedStudent.name,
            program: selectedStudent.program,
            school: selectedStudent.school,
            workplace: selectedStudent.workplace,
            project: selectedStudent.project,
          },
          judge: {
            id: selectedJudge.id,
            name: selectedJudge.name,
            dept: selectedJudge.dept,
          },
          scores,
          totalScore: grandTotal,
          maxScore,
        }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error || "ส่งคะแนนไม่สำเร็จ");
      }

      setSubmitMessage("บันทึกข้อมูลสำเร็จแล้ว");
      // เพิ่มนักศึกษาคนนี้ในรายการที่ประเมินเรียบร้อยแล้ว พร้อมเก็บคะแนน
      if (selectedStudent) {
        setCompletedSubmissions(prev => {
          const next = new Map(prev);
          next.set(selectedStudent.id, { total: grandTotal, max: maxScore });
          return next;
        });
      }
      setStep(0);
      setScores({});
      setSelectedStudent(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการส่งคะแนน";
      setSubmitMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const surfaceBase = "bg-[#f8f9fa] min-h-screen text-[#191c1d] antialiased leading-[1.8]";
  const focusCard =
    "bg-white p-5 sm:p-7 md:p-12 rounded-[1.25rem] md:rounded-[1.5rem] shadow-[0_20px_40px_rgba(25,28,29,0.04)] max-w-4xl mx-auto transition-all duration-500 relative";
  const primaryBtn =
    "bg-gradient-to-br from-[#9f4200] to-[#fe6c00] text-white px-6 py-3 rounded-full font-medium hover:scale-105 transition-transform flex items-center gap-2 disabled:opacity-30 disabled:hover:scale-100";
  const secondaryBtn =
    "text-[#5f00e3] border border-[#5f00e3]/20 px-6 py-3 rounded-full font-medium hover:bg-[#5f00e3]/5 transition-all flex items-center gap-2";

  return (
    <div className={surfaceBase}>
      <div
        className="fixed top-0 left-0 h-1.5 bg-gradient-to-r from-[#9f4200] to-[#fe6c00] transition-all duration-700 ease-out z-50"
        style={{ width: `${progress}%` }}
      />

      {step >= topicStartStep && (
        <nav className="fixed top-4 md:top-8 left-1/2 -translate-x-1/2 z-40 bg-white/95 backdrop-blur-xl p-3 rounded-2xl shadow-xl flex gap-2 items-center border border-gray-200 max-w-[90vw] overflow-x-auto">
          {config.topics.map((t, idx) => {
            const topicStep = idx + topicStartStep;
            const isActive = step === topicStep;
            const isDone = isTopicCompleted(idx);
            return (
              <button
                key={t.id}
                onClick={() => setStep(topicStep)}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all relative shrink-0 font-bold text-sm ${
                  isActive
                    ? "bg-gradient-to-br from-[#5f00e3] to-[#7b3ff2] text-white scale-105 shadow-lg"
                    : isDone
                      ? "bg-gradient-to-br from-[#e8f4fd] to-[#d1e9fc] text-[#5f00e3] border border-[#5f00e3]/20"
                      : "bg-gray-50 text-gray-400 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                {isDone && !isActive ? <Check size={18} /> : idx + 1}
              </button>
            );
          })}
          <div className="w-px h-8 bg-gray-300 mx-2" />
          <button
            onClick={() => setStep(summaryStep)}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0 ${
              step === summaryStep 
                ? "bg-gradient-to-br from-[#9f4200] to-[#fe6c00] text-white shadow-lg" 
                : "bg-gray-50 text-gray-400 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <LayoutGrid size={20} />
          </button>
        </nav>
      )}

      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 pt-20 pb-14 md:py-24">
        {step === 0 && (
          <div className="space-y-8 md:space-y-10">
            <header className="text-center space-y-4">
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-[#5f00e3]/10 to-[#7b3ff2]/10 rounded-full border border-[#5f00e3]/20">
                <span className="text-[#5f00e3] uppercase tracking-[0.2em] text-xs font-bold">Step 01</span>
                <div className="w-2 h-2 bg-[#5f00e3] rounded-full animate-pulse"></div>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-[#191c1d] to-[#5f00e3] bg-clip-text text-transparent">
                กรุณาเข้าสู่ระบบ
              </h1>
              <div className="flex flex-col items-center gap-3 text-sm md:text-base text-[#191c1d]/60">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-white rounded-full shadow-sm border border-gray-200">{config.title}</span>
                  <span className="text-gray-400">•</span>
                  <span>{config.subtitle}</span>
                </div>
                <p className="text-center max-w-md">
                  กรุณากรอกรหัสผ่านของท่านเพื่อยืนยันตัวตนกรรมการผู้ประเมิน
                </p>
              </div>
            </header>

            {loadingJudges ? (
              <div className="bg-white rounded-3xl p-8 shadow-sm">กำลังโหลดรายชื่อกรรมการ...</div>
            ) : availableJudges.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 shadow-sm text-[#191c1d]/60">ไม่พบรายชื่อกรรมการสำหรับประเภทนี้</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableJudges.map((j) => (
                <button
                  key={j.id}
                  onClick={() => {
                    setSelectedJudge(j);
                    setStep(1);
                  }}
                  className={`group text-left p-6 rounded-2xl transition-all relative overflow-hidden ${
                    selectedJudge?.id === j.id 
                      ? "bg-gradient-to-br from-[#5f00e3] to-[#7b3ff2] text-white shadow-xl scale-105" 
                      : "bg-white border border-gray-200 hover:border-[#5f00e3]/30 hover:shadow-lg hover:scale-[1.02]"
                  }`}
                >
                  <div className={`absolute top-0 right-0 w-20 h-20 rounded-full transition-all duration-500 ${
                    selectedJudge?.id === j.id 
                      ? "bg-white/10" 
                      : "bg-gradient-to-br from-[#5f00e3]/5 to-transparent"
                  }`}></div>
                  
                  <div className="relative z-10">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all ${
                      selectedJudge?.id === j.id 
                        ? "bg-white/20" 
                        : "bg-gradient-to-br from-[#5f00e3]/10 to-[#7b3ff2]/10"
                    }`}>
                      <User className={selectedJudge?.id === j.id ? "text-white" : "text-[#5f00e3]"} size={24} />
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold leading-tight">{j.name}</h3>
                      <p className={`text-sm ${
                        selectedJudge?.id === j.id ? "text-white/80" : "text-gray-600"
                      }`}>{j.dept}</p>
                    </div>
                    
                    <div className={`mt-4 text-xs font-medium ${
                      selectedJudge?.id === j.id ? "text-white/90" : "text-[#5f00e3]"
                    }`}>
                      {selectedJudge?.id === j.id ? "✓ ยืนยันตัวตนแล้ว" : "คลิกเพื่อเข้าสู่ระบบ"}
                    </div>
                  </div>
                </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-8 md:space-y-10">
            <header className="text-center space-y-4">
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-[#5f00e3]/10 to-[#7b3ff2]/10 rounded-full border border-[#5f00e3]/20">
                <span className="text-[#5f00e3] uppercase tracking-[0.2em] text-xs font-bold">Step 02</span>
                <div className="w-2 h-2 bg-[#5f00e3] rounded-full animate-pulse"></div>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-[#191c1d] to-[#5f00e3] bg-clip-text text-transparent">
                เลือกนักศึกษา
              </h1>
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full shadow-sm border border-gray-200">
                  <User size={14} className="text-[#5f00e3]" />
                  <span className="text-sm text-gray-700">{selectedJudge?.name}</span>
                </div>
                <button 
                  onClick={() => setStep(0)} 
                  className="text-sm text-[#5f00e3] hover:text-[#7b3ff2] transition-colors underline underline-offset-4"
                >
                  เปลี่ยนกรรมการ
                </button>
              </div>
            </header>

            {loadingStudents ? (
              <div className="bg-white rounded-3xl p-8 shadow-sm">กำลังโหลดรายชื่อนักศึกษา...</div>
            ) : students.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 shadow-sm text-[#191c1d]/60">ไม่พบรายชื่อนักศึกษาในประเภทนี้</div>
            ) : (
              <div className="space-y-4">
                {students.map((s) => {
                  const isCompleted = completedSubmissions.has(s.id);
                  const submissionInfo = completedSubmissions.get(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        if (!isCompleted) {
                          setSelectedStudent(s);
                          setStep(topicStartStep);
                        }
                      }}
                      disabled={isCompleted}
                      className={`w-full text-left p-5 rounded-2xl transition-all group relative overflow-hidden flex items-start gap-4 ${
                        isCompleted
                          ? "bg-gray-50 border border-gray-200 opacity-60 cursor-not-allowed"
                          : "bg-white border border-gray-200 hover:border-[#5f00e3]/30 hover:shadow-lg cursor-pointer"
                      }`}
                    >
                      {/* Left: Student Info */}
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded tracking-tighter ${
                            isCompleted ? "bg-gray-300 text-gray-600" : "bg-[#191c1d] text-white"
                          }`}>
                            ID {s.id}
                          </span>
                          <h2 className={`text-lg font-bold tracking-tight ${isCompleted ? "text-gray-500" : "text-[#191c1d]"}`}>
                            {s.name}
                          </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-start gap-2">
                            <BookOpen size={14} className={`mt-0.5 shrink-0 ${isCompleted ? "text-gray-400" : "text-gray-500"}`} />
                            <div className="min-w-0">
                              <div className={`text-[9px] font-bold uppercase tracking-wider ${isCompleted ? "text-gray-400" : "text-gray-500"}`}>
                                หลักสูตร / สำนักวิชา
                              </div>
                              <div className={`font-medium truncate ${isCompleted ? "text-gray-500" : "text-gray-700"}`}>
                                {s.program} · {s.school}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <Building2 size={14} className={`mt-0.5 shrink-0 ${isCompleted ? "text-gray-400" : "text-gray-500"}`} />
                            <div className="min-w-0">
                              <div className={`text-[9px] font-bold uppercase tracking-wider ${isCompleted ? "text-gray-400" : "text-gray-500"}`}>
                                หน่วยงานที่ปฏิบัติสหกิจ
                              </div>
                              <div className={`font-medium truncate ${isCompleted ? "text-gray-500" : "text-gray-700"}`}>
                                {s.workplace}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className={`text-[9px] font-bold uppercase tracking-wider mb-1 ${isCompleted ? "text-gray-400" : "text-gray-500"}`}>
                            หัวข้อโครงงาน
                          </div>
                          <div className={`text-sm italic leading-relaxed line-clamp-2 ${isCompleted ? "text-gray-500" : "text-gray-600"}`}>
                            {s.project}
                          </div>
                        </div>
                      </div>

                      {/* Right: Status */}
                      <div className="flex-shrink-0 text-right">
                        {isCompleted ? (
                          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 min-w-[120px]">
                            <div className="text-[9px] font-bold uppercase tracking-wider text-green-600 mb-1">
                              ประเมินแล้ว
                            </div>
                            <div className="text-2xl font-bold text-green-600">
                              {submissionInfo ? submissionInfo.total.toFixed(2) : "✓"}
                            </div>
                            <div className="text-[10px] text-green-500 mt-1">
                              / {submissionInfo?.max ?? 100}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 min-w-[120px]">
                            <div className="text-[9px] font-bold uppercase tracking-wider text-orange-600 mb-1">
                              ยังไม่ประเมิน
                            </div>
                            <div className="text-2xl font-bold text-orange-600">
                              --
                            </div>
                            <div className="text-[10px] text-orange-500 mt-1">
                              / 100
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {step >= topicStartStep && step <= topicEndStep && (
          <div className="space-y-8 md:space-y-10">
            <header className="text-center space-y-6">
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-[#5f00e3]/10 to-[#7b3ff2]/10 rounded-full border border-[#5f00e3]/20">
                <span className="text-[#5f00e3] uppercase tracking-[0.2em] text-xs font-bold">
                  Topic {String(step - 1).padStart(2, "0")} / {String(config.topics.length).padStart(2, "0")}
                </span>
                <div className="w-2 h-2 bg-[#5f00e3] rounded-full animate-pulse"></div>
              </div>
              
              {(() => {
                const title = config.topics[step - topicStartStep].title;
                // หาวิธีแยกหัวข้อและรายละเอียดที่ดีกว่า
                const parts = title.split(/ มีการ| โดย| และ| ทั้ง| อันเนื่องมาจาก| ที่นำไป| ซึ่ง| ผู้มี| 1\)|2\)/);
                const summary = parts[0]?.trim() || title;
                const description = parts.slice(1).join('').trim();
                return (
                  <>
                    <h1 className="text-base sm:text-lg md:text-xl font-bold tracking-tight bg-gradient-to-r from-[#191c1d] to-[#5f00e3] bg-clip-text text-transparent max-w-4xl mx-auto leading-tight">
                      {summary}
                    </h1>
                    {description && (
                      <div className="text-sm md:text-base text-gray-600 max-w-4xl mx-auto leading-relaxed bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
                        {description}
                      </div>
                    )}
                  </>
                );
              })()}
              
              <div className="flex items-center justify-center gap-6">
                <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-full shadow-lg border border-gray-200">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#9f4200]/10 to-[#fe6c00]/10 rounded-full flex items-center justify-center">
                    <GraduationCap size={16} className="text-[#9f4200]" />
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] opacity-60 font-black uppercase tracking-widest">Student</div>
                    <div className="font-bold text-sm">{selectedStudent?.name}</div>
                    <div className="text-[10px] opacity-60">{selectedStudent?.workplace}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-full shadow-lg border border-gray-200">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#5f00e3]/10 to-[#7b3ff2]/10 rounded-full flex items-center justify-center">
                    <User size={16} className="text-[#5f00e3]" />
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] opacity-60 font-black uppercase tracking-widest">Judge</div>
                    <div className="font-bold text-sm">{selectedJudge?.name}</div>
                    <div className="text-[10px] opacity-60">{selectedJudge?.dept}</div>
                  </div>
                </div>
              </div>
            </header>

            <div className={focusCard}>
              <div className="space-y-8">
                {config.topics[step - topicStartStep].questions.map((q, idx) => (
                  <div key={q.id} className="group relative bg-gradient-to-r from-white to-gray-50/30 rounded-2xl p-6 border border-gray-200 hover:border-[#5f00e3]/30 transition-all">
                    <div className="flex items-start gap-6">
                      {/* Question Number */}
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#5f00e3]/10 to-[#7b3ff2]/10 rounded-xl flex items-center justify-center">
                          <span className="text-lg font-bold text-[#5f00e3]">{idx + 1}</span>
                        </div>
                      </div>
                      
                      {/* Question Text */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg md:text-xl font-semibold text-[#191c1d] leading-relaxed mb-4">
                          {q.text}
                        </h3>
                      </div>
                      
                      {/* Score Input */}
                      <div className="flex-shrink-0">
                        <div className="text-center">
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-2">
                            คะแนน (เต็ม {q.max})
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="0.00"
                              value={scores[q.id] !== undefined && scores[q.id] !== 0 ? scores[q.id] : ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '') {
                                  handleScoreChange(q.id, '', q.max);
                                  return;
                                }
                                const clean = value.replace(/[^0-9.]/g, '');
                                const parts = clean.split('.');
                                let final = parts[0];
                                if (parts.length > 1) final += '.' + parts[1].slice(0, 2);
                                if (final.startsWith('.')) final = '0' + final;
                                handleScoreChange(q.id, final, q.max);
                              }}
                              onKeyDown={(e) => {
                                if (!/[0-9.]|Backspace|Delete|ArrowLeft|ArrowRight|Tab/.test(e.key)) {
                                  e.preventDefault();
                                }
                              }}
                              className="w-24 h-14 text-xl font-bold bg-white border-2 border-gray-200 rounded-xl focus:border-[#5f00e3] focus:ring-2 focus:ring-[#5f00e3]/20 transition-all outline-none text-center"
                            />
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#5f00e3] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 pt-8 border-t border-gray-200">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-gradient-to-r from-gray-50 to-white rounded-2xl p-6 border border-gray-200">
                  <div className="text-center md:text-left">
                    <div className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-2">Section Subtotal</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-[#9f4200]">{calculateTopicTotal(step - topicStartStep).toFixed(2)}</span>
                      <span className="text-lg text-gray-400">/ {calculateTopicMax(step - topicStartStep)}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {((calculateTopicTotal(step - topicStartStep) / calculateTopicMax(step - topicStartStep)) * 100).toFixed(2)}% Complete
                    </div>
                  </div>
                  
                  <div className="flex gap-3 w-full md:w-auto">
                    <button 
                      onClick={() => setStep(step - 1)} 
                      className="flex-1 md:flex-none px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                    >
                      <ChevronLeft size={18} /> ย้อนกลับ
                    </button>
                    {step < topicEndStep ? (
                      <button 
                        onClick={() => setStep(step + 1)} 
                        disabled={!isTopicCompleted(step - topicStartStep)}
                        className="flex-1 md:flex-none px-6 py-3 bg-gradient-to-br from-[#5f00e3] to-[#7b3ff2] text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:shadow-none"
                      >
                        ถัดไป <ChevronRight size={18} />
                      </button>
                    ) : (
                      <button 
                        onClick={() => setStep(summaryStep)} 
                        disabled={!isTopicCompleted(step - topicStartStep)}
                        className="flex-1 md:flex-none px-6 py-3 bg-gradient-to-br from-[#9f4200] to-[#fe6c00] text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:shadow-none"
                      >
                        <LayoutGrid size={18} /> สรุปคะแนน
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === summaryStep && (
          <div className="space-y-8 md:space-y-10">
            <header className="text-center space-y-3">
              <span className="text-[#5f00e3] uppercase tracking-[0.2em] text-xs font-bold opacity-60">Review & Submit</span>
              <h1 className="text-3xl md:text-6xl font-bold tracking-tight">สรุปผลคะแนน</h1>
            </header>

            <div className="grid md:grid-cols-[1fr_340px] gap-8 items-start">
              <div className="space-y-6">
                <div className="bg-[#f3f4f5] p-8 rounded-[1.5rem] space-y-5">
                  <div className="flex items-start gap-3">
                    <User className="text-[#5f00e3] mt-1 shrink-0" />
                    <div>
                      <div className="text-[10px] font-black uppercase opacity-40 tracking-widest">นักศึกษาผู้รับการประเมิน</div>
                      <div className="text-lg font-bold">{selectedStudent?.name} ({selectedStudent?.id})</div>
                      <div className="text-sm opacity-60">{selectedStudent?.program} · {selectedStudent?.school}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Building2 className="text-[#5f00e3] mt-1 shrink-0" />
                    <div>
                      <div className="text-[10px] font-black uppercase opacity-40 tracking-widest">หน่วยงาน / หัวข้อโครงงาน</div>
                      <div className="text-sm font-bold">{selectedStudent?.workplace}</div>
                      <div className="text-sm italic opacity-60 leading-relaxed mt-1">{selectedStudent?.project}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {config.topics.map((topic, idx) => {
                    const topicScore = calculateTopicTotal(idx);
                    const topicMax = calculateTopicMax(idx);
                    return (
                      <button
                        key={topic.id}
                        onClick={() => setStep(idx + topicStartStep)}
                        className="w-full bg-white p-5 rounded-2xl flex justify-between items-center shadow-sm hover:shadow-md transition-all border-l-4 border-transparent hover:border-[#5f00e3]"
                      >
                        <div className="flex gap-4 items-center text-left">
                          <span className="text-xl font-bold text-[#5f00e3]/20">{idx + 1}</span>
                          <div className="font-medium text-sm md:text-base">{topic.title}</div>
                        </div>
                        <div className="text-right ml-4 min-w-[90px]">
                          <div className="text-xl font-bold text-[#9f4200]">
                            {topicScore.toFixed(2)} <span className="text-xs opacity-40 font-normal">/ {topicMax}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="md:sticky md:top-24 space-y-6">
                <div className="bg-[#5f00e3] text-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl relative overflow-hidden">
                  <div className="relative z-10 space-y-6">
                    <div>
                      <div className="text-[10px] opacity-60 font-black uppercase tracking-widest mb-2">Grand Total Score</div>
                      <div className="text-5xl sm:text-6xl font-bold leading-none tracking-tighter">{grandTotal}</div>
                      <div className="text-base font-medium mt-3">Out of {maxScore} points</div>
                    </div>
                    <div className="space-y-3 pt-6 border-t border-white/10">
                      <div className="flex justify-between items-start text-xs gap-2">
                        <span className="opacity-60 uppercase tracking-widest">Evaluated By</span>
                        <span className="font-bold text-right">{selectedJudge?.name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -bottom-8 -right-6 text-[10rem] font-bold text-white/5 select-none pointer-events-none italic">S</div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full bg-[#191c1d] text-white min-h-12 p-4 sm:p-5 rounded-full font-bold text-base sm:text-lg hover:bg-black transition-all flex items-center justify-center gap-3 group shadow-xl"
                >
                  {isSubmitting ? "กำลังบันทึกคะแนน..." : "ส่งผลคะแนนอย่างเป็นทางการ"}
                  <Send className="group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform" size={20} />
                </button>
                {submitMessage && (
                  <p className="text-center text-sm text-[#191c1d]/70 bg-white rounded-xl p-3 shadow-sm">{submitMessage}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        className="fixed top-0 right-0 w-[40%] h-screen bg-[#f3f4f5] -z-10 pointer-events-none"
        style={{ clipPath: "polygon(100% 0, 0% 0, 100% 100%)" }}
      />
      <div
        className="fixed bottom-12 left-4 md:left-12 text-[10px] font-black uppercase tracking-[0.5em] opacity-5 -z-10 select-none"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        WU COOP ASSESSMENT 2026
      </div>
    </div>
  );
}
