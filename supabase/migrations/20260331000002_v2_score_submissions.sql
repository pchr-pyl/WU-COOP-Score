-- ============================================================
-- V2: Score Submissions Table (with v2_ prefix)
-- ระบบลงคะแนนประกวดสหกิจ — WU Coop Award System
-- ============================================================
-- เป้าหมาย: สร้างตารางใหม่ที่ไม่ชนกับตารางเดิม (score_submissions)
-- ตารางเดิมยังคงอยู่ครบ — ตารางใหม่นี้พร้อมใช้งานทันที
-- ============================================================

-- Enable UUID extension (usually pre-enabled on Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM: v2_category_key
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'v2_category_key') THEN
    CREATE TYPE public.v2_category_key AS ENUM (
      'sci-tech',
      'social-huma',
      'innovation',
      'inter'
    );
  END IF;
END $$;

-- ============================================================
-- DROP existing v2 objects (idempotent)
-- ============================================================
DROP TABLE IF EXISTS public.v2_score_submissions CASCADE;
DROP VIEW IF EXISTS public.v2_student_score_summary CASCADE;
DROP VIEW IF EXISTS public.v2_category_score_summary CASCADE;
DROP VIEW IF EXISTS public.v2_judge_submission_status CASCADE;

-- ============================================================
-- TABLE: v2_score_submissions
-- ============================================================
CREATE TABLE public.v2_score_submissions (
  -- Primary Key
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Judge Info ──
  judge_id          text NOT NULL,
  judge_name        text NOT NULL,
  judge_dept        text NOT NULL,

  -- ── Student Info ──
  -- student_id ไม่ unique ข้าม category ต้องใช้ (student_id, category) คู่กันเสมอ
  student_id        text NOT NULL,
  student_name      text NOT NULL,
  student_program   text NOT NULL DEFAULT '',
  student_school    text NOT NULL DEFAULT '',
  student_workplace text NOT NULL DEFAULT '',
  student_project   text NOT NULL DEFAULT '',

  -- ── Category ──
  category          public.v2_category_key NOT NULL,
  category_title    text NOT NULL,

  -- ── Scores ──
  scores            jsonb NOT NULL DEFAULT '{}',
  total_score       numeric(7, 2) NOT NULL CHECK (total_score >= 0),
  max_score         numeric(7, 2) NOT NULL CHECK (max_score > 0),

  -- ── Computed (stored) ──
  score_pct         numeric(6, 3) GENERATED ALWAYS AS (
                      ROUND((total_score / max_score) * 100, 3)
                    ) STORED,

  -- ── Timestamps ──
  submitted_at      timestamptz NOT NULL DEFAULT now(),

  -- ── Unique constraint ──
  CONSTRAINT uq_v2_judge_student_category
    UNIQUE (judge_id, student_id, category)
);

-- ── Indexes ──
CREATE INDEX idx_v2_submissions_category     ON public.v2_score_submissions (category);
CREATE INDEX idx_v2_submissions_judge_id     ON public.v2_score_submissions (judge_id);
CREATE INDEX idx_v2_submissions_student_cat  ON public.v2_score_submissions (student_id, category);
CREATE INDEX idx_v2_submissions_submitted_at ON public.v2_score_submissions (submitted_at DESC);

-- ── Comments ──
COMMENT ON TABLE public.v2_score_submissions IS
  'V2: ผลการประเมินผลงานสหกิจ — 1 row = กรรมการ 1 คน ประเมินนักศึกษา 1 คน';
COMMENT ON COLUMN public.v2_score_submissions.scores IS
  'คะแนนรายข้อ เช่น {"q1_1": 4, "q1_2": 5} ตาม assessment-config.ts';
COMMENT ON COLUMN public.v2_score_submissions.score_pct IS
  'คะแนนเป็น % = (total_score / max_score) * 100 (computed, stored)';
COMMENT ON COLUMN public.v2_score_submissions.student_id IS
  'student_id จาก students.json — ไม่ unique ข้าม category ต้องใช้คู่กับ category เสมอ';

-- ============================================================
-- VIEW: v2_student_score_summary
-- ============================================================
CREATE VIEW public.v2_student_score_summary AS
SELECT
  student_id,
  student_name,
  category,
  category_title,
  student_program   AS program,
  student_school    AS school,
  student_workplace AS workplace,
  student_project   AS project,
  COUNT(*)::int                                         AS judge_count,
  ROUND(AVG(total_score), 2)                            AS avg_score,
  MAX(max_score)                                        AS max_score,
  ROUND(AVG(score_pct), 3)                              AS avg_pct,
  ARRAY_AGG(total_score ORDER BY submitted_at)          AS scores,
  MAX(submitted_at)                                     AS last_submitted_at
FROM public.v2_score_submissions
GROUP BY
  student_id, student_name, category, category_title,
  student_program, student_school, student_workplace, student_project;

COMMENT ON VIEW public.v2_student_score_summary IS
  'V2: สรุปคะแนนของนักศึกษาแต่ละคน';

-- ============================================================
-- VIEW: v2_category_score_summary
-- ============================================================
CREATE VIEW public.v2_category_score_summary AS
SELECT
  category,
  category_title,
  COUNT(*)::int              AS submission_count,
  COUNT(DISTINCT student_id) AS student_count,
  COUNT(DISTINCT judge_id)   AS judge_count,
  ROUND(AVG(score_pct), 3)   AS avg_pct,
  MAX(submitted_at)          AS last_updated
FROM public.v2_score_submissions
GROUP BY category, category_title;

COMMENT ON VIEW public.v2_category_score_summary IS
  'V2: สถิติรวมต่อ category';

-- ============================================================
-- VIEW: v2_judge_submission_status
-- ============================================================
CREATE VIEW public.v2_judge_submission_status AS
SELECT
  judge_id,
  judge_name,
  category,
  COUNT(*)::int                                         AS submitted_count,
  ARRAY_AGG(student_id ORDER BY submitted_at)           AS submitted_student_ids,
  MAX(submitted_at)                                     AS last_submitted_at
FROM public.v2_score_submissions
GROUP BY judge_id, judge_name, category;

COMMENT ON VIEW public.v2_judge_submission_status IS
  'V2: สถานะการส่งคะแนนของกรรมการแต่ละคน';

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.v2_score_submissions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- สรุป Objects ที่สร้าง
-- ============================================================
-- 1. ENUM:  v2_category_key
-- 2. TABLE: v2_score_submissions
-- 3. VIEW:  v2_student_score_summary
-- 4. VIEW:  v2_category_score_summary
-- 5. VIEW:  v2_judge_submission_status
-- 6. INDEX: 4 indexes
-- ============================================================
