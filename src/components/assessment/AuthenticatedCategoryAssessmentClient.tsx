"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Building2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Home,
  LayoutGrid,
  Send,
  ShieldAlert,
  User,
} from "lucide-react";
import type { CategoryConfig, CategoryKey } from "@/lib/assessment-config";
import {
  canJudgeAccessCategory,
  JUDGE_SESSION_STORAGE_KEY,
  type JudgeRecord,
} from "@/lib/judge-session";

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

export default function AuthenticatedCategoryAssessmentClient({ config }: Props) {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [activeJudge, setActiveJudge] = useState<JudgeRecord | null>(null);
  const [judgeChecked, setJudgeChecked] = useState(false);
  const [step, setStep] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(JUDGE_SESSION_STORAGE_KEY);
    if (!stored) {
      setJudgeChecked(true);
      return;
    }

    try {
      const parsed = JSON.parse(stored) as JudgeRecord;
      setActiveJudge(parsed);
    } catch {
      window.localStorage.removeItem(JUDGE_SESSION_STORAGE_KEY);
    } finally {
      setJudgeChecked(true);
    }
  }, []);

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
        setStudents(all.filter((student) => student.category === config.key));
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

  const totalSteps = config.topics.length + 2;
  const summaryStep = totalSteps - 1;
  const topicStartStep = 1;
  const topicEndStep = summaryStep - 1;
  const progress = totalSteps > 1 ? (step / (totalSteps - 1)) * 100 : 0;

  const maxScore = useMemo(
    () =>
      config.topics.reduce(
        (sum, topic) => sum + topic.questions.reduce((topicSum, question) => topicSum + question.max, 0),
        0,
      ),
    [config.topics],
  );

  const grandTotal = useMemo(
    () => Object.values(scores).reduce((sum, value) => sum + (Number(value) || 0), 0),
    [scores],
  );

  const handleScoreChange = (questionId: string, value: string, max: number) => {
    const numericValue = Math.min(Math.max(0, Number.parseFloat(value) || 0), max);
    setScores((prev) => ({ ...prev, [questionId]: numericValue }));
  };

  const calculateTopicTotal = (topicIndex: number) => {
    const topic = config.topics[topicIndex];
    return topic.questions.reduce((sum, question) => sum + (scores[question.id] || 0), 0);
  };

  const calculateTopicMax = (topicIndex: number) => {
    const topic = config.topics[topicIndex];
    return topic.questions.reduce((sum, question) => sum + question.max, 0);
  };

  const canAccess = activeJudge ? canJudgeAccessCategory(activeJudge, config.key) : false;

  const handleSubmit = async () => {
    if (!selectedStudent || !activeJudge) {
      setSubmitMessage("กรุณาเลือกนักศึกษาก่อนส่งคะแนน");
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
            id: activeJudge.id,
            name: activeJudge.name,
            dept: activeJudge.dept,
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
      setStep(0);
      setScores({});
      setSelectedStudent(null);
      router.refresh();
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

  if (!judgeChecked) {
    return <div className="min-h-screen bg-[#f8f9fa] px-6 py-16 text-center text-[#191c1d]/60">กำลังตรวจสอบสิทธิ์กรรมการ...</div>;
  }

  if (!activeJudge) {
    return (
      <main className="min-h-screen bg-[#f8f9fa] px-4 py-10 sm:px-6 md:px-8 flex items-center justify-center">
        <div className="max-w-xl w-full bg-white rounded-[1.5rem] p-8 text-center shadow-[0_20px_40px_rgba(25,28,29,0.04)] space-y-5">
          <ShieldAlert className="mx-auto text-[#9f4200]" size={42} />
          <h1 className="text-2xl font-bold">ยังไม่ได้ระบุตัวตนกรรมการ</h1>
          <p className="text-sm text-[#191c1d]/60">กรุณากลับไปหน้าแรกเพื่อกรอก username และ password ก่อนเข้าแบบประเมิน</p>
          <Link href="/" className="inline-flex items-center gap-2 rounded-full px-5 py-3 bg-gradient-to-br from-[#9f4200] to-[#fe6c00] text-white font-medium">
            <Home size={18} /> กลับหน้าแรก
          </Link>
        </div>
      </main>
    );
  }

  if (!canAccess) {
    return (
      <main className="min-h-screen bg-[#f8f9fa] px-4 py-10 sm:px-6 md:px-8 flex items-center justify-center">
        <div className="max-w-xl w-full bg-white rounded-[1.5rem] p-8 text-center shadow-[0_20px_40px_rgba(25,28,29,0.04)] space-y-5">
          <ShieldAlert className="mx-auto text-[#9f4200]" size={42} />
          <h1 className="text-2xl font-bold">อาจารย์ท่านนี้ไม่มีสิทธิ์ประเมินหมวดนี้</h1>
          <p className="text-sm text-[#191c1d]/60">ระบบจะแสดงเฉพาะประเภทที่อาจารย์มีสิทธิ์ประเมินเท่านั้น กรุณากลับไปเลือกหมวดที่ได้รับสิทธิ์</p>
          <Link href="/" className="inline-flex items-center gap-2 rounded-full px-5 py-3 bg-gradient-to-br from-[#9f4200] to-[#fe6c00] text-white font-medium">
            <Home size={18} /> กลับหน้าแรก
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className={surfaceBase}>
      <div
        className="fixed top-0 left-0 h-1.5 bg-gradient-to-r from-[#9f4200] to-[#fe6c00] transition-all duration-700 ease-out z-50"
        style={{ width: `${progress}%` }}
      />

      <div className="fixed top-3 left-3 md:top-6 md:left-6 z-40">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-white/92 backdrop-blur-xl px-4 py-2 text-sm font-medium text-[#191c1d] shadow-lg hover:bg-white transition-colors"
        >
          <Home size={16} /> กลับหน้า Home
        </Link>
      </div>

      {step >= topicStartStep && (
        <nav className="fixed top-3 md:top-6 left-1/2 -translate-x-1/2 z-40 bg-white/90 backdrop-blur-xl p-2 rounded-full shadow-lg flex gap-1 items-center border border-white/50 max-w-[95vw] overflow-x-auto">
          {config.topics.map((topic, idx) => {
            const topicStep = idx + topicStartStep;
            const isActive = step === topicStep;
            const isDone = topic.questions.every((question) => scores[question.id] !== undefined);
            return (
              <button
                key={topic.id}
                onClick={() => setStep(topicStep)}
                className={`w-11 h-11 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all relative shrink-0 ${
                  isActive
                    ? "bg-[#5f00e3] text-white scale-105 shadow-md"
                    : isDone
                      ? "bg-[#5f00e3]/10 text-[#5f00e3]"
                      : "bg-transparent text-[#191c1d]/30 hover:bg-[#f3f4f5]"
                }`}
              >
                <span className="text-sm font-bold">{idx + 1}</span>
              </button>
            );
          })}
          <div className="w-px h-6 bg-[#f3f4f5] mx-1" />
          <button
            onClick={() => setStep(summaryStep)}
            className={`w-11 h-11 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${
              step === summaryStep ? "bg-[#9f4200] text-white" : "text-[#191c1d]/30 hover:bg-[#f3f4f5]"
            }`}
          >
            <LayoutGrid size={18} />
          </button>
        </nav>
      )}

      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 pt-20 pb-14 md:py-24">
        {step === 0 && (
          <div className="space-y-8 md:space-y-10">
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
              <header className="space-y-3">
                <span className="text-[#5f00e3] uppercase tracking-[0.2em] text-xs font-bold opacity-60">Step 01</span>
                <h1 className="text-2xl sm:text-3xl md:text-6xl font-bold tracking-tight">เลือกนักศึกษา</h1>
                <p className="text-sm md:text-base text-[#191c1d]/60">{config.title} | {config.subtitle}</p>
              </header>
              <div className="bg-white rounded-2xl px-4 py-3 shadow-sm">
                <div className="text-[10px] uppercase tracking-widest text-[#191c1d]/45 font-bold">ผู้ประเมิน</div>
                <div className="font-bold">{activeJudge.name}</div>
                <div className="text-xs text-[#191c1d]/55">{activeJudge.dept}</div>
              </div>
            </div>

            {loadingStudents ? (
              <div className="bg-white rounded-3xl p-8 shadow-sm">กำลังโหลดรายชื่อนักศึกษา...</div>
            ) : students.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 shadow-sm text-[#191c1d]/60">ไม่พบรายชื่อนักศึกษาในประเภทนี้</div>
            ) : (
              <div className="space-y-6">
                {students.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => {
                      setSelectedStudent(student);
                      setStep(topicStartStep);
                    }}
                    className={`w-full text-left p-4 sm:p-6 md:p-8 rounded-[1.2rem] md:rounded-[1.5rem] transition-all group relative overflow-hidden ${
                      selectedStudent?.id === student.id ? "bg-[#5f00e3] text-white shadow-xl" : "bg-white shadow-sm hover:shadow-xl"
                    }`}
                  >
                    <div className="space-y-4 relative z-10">
                      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                        <span
                          className={`text-[10px] uppercase font-black px-2 py-0.5 rounded tracking-tighter w-fit ${
                            selectedStudent?.id === student.id ? "bg-white text-[#5f00e3]" : "bg-[#191c1d] text-white"
                          }`}
                        >
                          ID {student.id}
                        </span>
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{student.name}</h2>
                      </div>

                      <div className="grid md:grid-cols-2 gap-5">
                        <div className="flex items-start gap-3">
                          <BookOpen size={18} className="mt-1 opacity-40 shrink-0" />
                          <div>
                            <div className="text-[10px] font-bold uppercase opacity-40 tracking-widest">หลักสูตร / สำนักวิชา</div>
                            <div className="text-sm font-medium">{student.program} · {student.school}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Building2 size={18} className="mt-1 opacity-40 shrink-0" />
                          <div>
                            <div className="text-[10px] font-bold uppercase opacity-40 tracking-widest">หน่วยงานที่ปฏิบัติสหกิจ</div>
                            <div className="text-sm font-medium">{student.workplace}</div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold uppercase opacity-40 tracking-widest">หัวข้อโครงงาน</div>
                        <div className="text-sm italic opacity-80 leading-relaxed">{student.project}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step >= topicStartStep && step <= topicEndStep && selectedStudent && (
          <div className="space-y-8 md:space-y-10">
            <header className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="space-y-2">
                <span className="text-[#5f00e3] uppercase tracking-[0.2em] text-xs font-bold opacity-60">
                  Topic {String(step).padStart(2, "0")} / {String(config.topics.length).padStart(2, "0")}
                </span>
                <h1 className="text-xl sm:text-2xl md:text-4xl font-bold max-w-3xl leading-tight">{config.topics[step - topicStartStep].title}</h1>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-3 shrink-0 md:max-w-sm">
                <div className="w-9 h-9 bg-[#f3f4f5] rounded-full flex items-center justify-center shrink-0">
                  <GraduationCap size={18} className="text-[#9f4200]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] opacity-40 font-black uppercase tracking-widest">Student</div>
                  <div className="font-bold text-sm truncate">{selectedStudent.name}</div>
                  <div className="text-[10px] opacity-60 truncate">{selectedStudent.workplace}</div>
                </div>
              </div>
            </header>

            <div className={focusCard}>
              <div className="space-y-10 sm:space-y-12">
                {config.topics[step - topicStartStep].questions.map((question, index) => (
                  <div key={question.id} className="relative grid md:grid-cols-[1fr_160px] gap-6 md:gap-8 items-start">
                    <div className="relative">
                      <span className="absolute -left-8 -top-4 text-6xl font-bold text-[#5f00e3]/5 select-none">{String(index + 1).padStart(2, "0")}</span>
                      <h3 className="text-base sm:text-lg md:text-xl font-medium relative z-10 pt-2">{question.text}</h3>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-[#191c1d]/40 uppercase tracking-widest">คะแนน (เต็ม {question.max})</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*\.?[0-9]{0,2}"
                        min="0"
                        max={question.max}
                        step="0.01"
                        placeholder="0"
                        value={scores[question.id] ?? ""}
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
                          handleScoreChange(question.id, finalValue, question.max);
                        }}
                        onKeyPress={(e) => {
                          const char = e.key;
                          // อนุญาตเฉพาะตัวเลข และจุดทศนิยม
                          if (!/[0-9.]/.test(char)) {
                            e.preventDefault();
                          }
                        }}
                        className="w-full min-h-12 text-2xl font-bold p-3.5 bg-[#f3f4f5] rounded-xl border-none focus:ring-4 focus:ring-[#5f00e3]/10 focus:bg-white transition-all outline-none text-center"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 sm:mt-14 pt-6 sm:pt-8 border-t border-[#f3f4f5] flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
                <div className="text-sm">
                  <span className="opacity-40 uppercase font-bold tracking-widest text-xs">Section Subtotal:</span>
                  <span className="ml-2 font-bold text-2xl text-[#9f4200]">{calculateTopicTotal(step - topicStartStep).toFixed(2)}</span>
                  <span className="ml-1 opacity-40">/ {calculateTopicMax(step - topicStartStep)}</span>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <button onClick={() => setStep(step - 1)} className={`${secondaryBtn} flex-1 sm:flex-none min-h-11`}>
                    <ChevronLeft size={18} /> Back
                  </button>
                  <button onClick={() => setStep(step + 1)} className={`${primaryBtn} flex-1 sm:flex-none min-h-11`}>
                    {step === topicEndStep ? "View Summary" : "Next"} <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === summaryStep && selectedStudent && (
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
                      <div className="text-lg font-bold">{selectedStudent.name} ({selectedStudent.id})</div>
                      <div className="text-sm opacity-60">{selectedStudent.program} · {selectedStudent.school}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Building2 className="text-[#5f00e3] mt-1 shrink-0" />
                    <div>
                      <div className="text-[10px] font-black uppercase opacity-40 tracking-widest">หน่วยงาน / หัวข้อโครงงาน</div>
                      <div className="text-sm font-bold">{selectedStudent.workplace}</div>
                      <div className="text-sm italic opacity-60 leading-relaxed mt-1">{selectedStudent.project}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {config.topics.map((topic, index) => {
                    const topicScore = calculateTopicTotal(index);
                    const topicMax = calculateTopicMax(index);
                    return (
                      <button
                        key={topic.id}
                        onClick={() => setStep(index + topicStartStep)}
                        className="w-full bg-white p-5 rounded-2xl flex justify-between items-center shadow-sm hover:shadow-md transition-all border-l-4 border-transparent hover:border-[#5f00e3]"
                      >
                        <div className="flex gap-4 items-center text-left">
                          <span className="text-xl font-bold text-[#5f00e3]/20">{index + 1}</span>
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
                        <span className="font-bold text-right">{activeJudge.name}</span>
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
                {submitMessage && <p className="text-center text-sm text-[#191c1d]/70 bg-white rounded-xl p-3 shadow-sm">{submitMessage}</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
