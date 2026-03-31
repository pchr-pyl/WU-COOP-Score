-- ============================================================
-- Network Level: Score Submissions Table
-- ระบบลงคะแนนประกวดสหกิจระดับเครือข่าย — WU Coop Award System
-- ============================================================
-- เป้าหมาย: สร้างตารางใหม่สำหรับรอบระดับเครือข่าย (แยกจากรอบมหาวิทยาลัย)
-- ตารางเดิม score_submissions ยังคงเก็บข้อมูลรอบมหาวิทยาลัย
-- ============================================================

-- Enable UUID extension (usually pre-enabled on Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM: network_category_key
-- ตรงกับ CategoryKey ใน src/lib/assessment-config.ts
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'network_category_key') THEN
    CREATE TYPE public.network_category_key AS ENUM (
      'sci-tech',
      'social-huma',
      'innovation',
      'inter'
    );
  END IF;
END $$;

-- ============================================================
-- TABLE: network_score_submissions
-- เก็บผลการประเมินของกรรมการแต่ละคนต่อนักศึกษาแต่ละคน (ระดับเครือข่าย)
-- ============================================================
DROP TABLE IF EXISTS public.network_score_submissions CASCADE;
DROP VIEW IF EXISTS public.v_network_student_score_summary CASCADE;
DROP VIEW IF EXISTS public.v_network_category_score_summary CASCADE;
DROP VIEW IF EXISTS public.v_network_judge_submission_status CASCADE;

CREATE TABLE public.network_score_submissions (
  -- Primary Key
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Judge Info (denormalized จาก judges.json) ──
  judge_id          text NOT NULL,
  judge_name        text NOT NULL,
  judge_dept        text NOT NULL,

  -- ── Student Info (denormalized จาก students.json) ──
  -- หมายเหตุ: student_id ใน JSON ไม่ unique ข้าม category (S001 มีใน sci-tech, innovation ฯลฯ)
  -- ต้องใช้ (student_id, category) คู่กันเสมอ
  student_id        text NOT NULL,
  student_name      text NOT NULL,
  student_program   text NOT NULL DEFAULT '',
  student_school    text NOT NULL DEFAULT '',
  student_workplace text NOT NULL DEFAULT '',
  student_project   text NOT NULL DEFAULT '',

  -- ── Category ──
  category          public.network_category_key NOT NULL,
  category_title    text NOT NULL,

  -- ── Scores ──
  -- scores เก็บ Record<string, number> เช่น {"q1_1": 4, "q1_2": 5, "q2_1": 9, ...}
  -- ใช้ jsonb เพื่อความยืดหยุ่น (แต่ละ category มี question structure ต่างกัน)
  -- สามารถ query รายข้อได้ด้วย jsonb operators เช่น scores->>'q1_1'
  scores            jsonb NOT NULL DEFAULT '{}',
  total_score       numeric(7, 2) NOT NULL CHECK (total_score >= 0),
  max_score         numeric(7, 2) NOT NULL CHECK (max_score > 0),

  -- ── Computed helpers (stored for fast dashboard queries) ──
  score_pct         numeric(6, 3) GENERATED ALWAYS AS (
                      ROUND((total_score / max_score) * 100, 3)
                    ) STORED,

  -- ── Timestamps ──
  submitted_at      timestamptz NOT NULL DEFAULT now(),

  -- ── Constraints ──
  -- กรรมการ 1 คน ประเมินนักศึกษา 1 คน ใน category เดียว ได้ 1 ครั้งเท่านั้น
  CONSTRAINT uq_network_judge_student_category
    UNIQUE (judge_id, student_id, category)
);

-- ── Indexes ──
-- Dashboard query: ดูคะแนนรวมทุก student ใน category
CREATE INDEX idx_network_submissions_category        ON public.network_score_submissions (category);
-- Query: กรรมการคนนี้ประเมินใครบ้าง
CREATE INDEX idx_network_submissions_judge_id        ON public.network_score_submissions (judge_id);
-- Query: นักศึกษาคนนี้ได้คะแนนอะไรบ้าง
CREATE INDEX idx_network_submissions_student_cat     ON public.network_score_submissions (student_id, category);
-- Dashboard sort by time
CREATE INDEX idx_network_submissions_submitted_at    ON public.network_score_submissions (submitted_at DESC);

-- ── Comment ──
COMMENT ON TABLE public.network_score_submissions IS
  'ผลการประเมินผลงานสหกิจระดับเครือข่าย — 1 row = กรรมการ 1 คน ประเมินนักศึกษา 1 คน';
COMMENT ON COLUMN public.network_score_submissions.scores IS
  'คะแนนรายข้อ เช่น {"q1_1": 4, "q1_2": 5} ตาม assessment-config.ts';
COMMENT ON COLUMN public.network_score_submissions.score_pct IS
  'คะแนนเป็น % = (total_score / max_score) * 100 (computed, stored)';
COMMENT ON COLUMN public.network_score_submissions.student_id IS
  'student_id จาก students.json — ไม่ unique ข้าม category ต้องใช้คู่กับ category เสมอ';


-- ============================================================
-- VIEW: v_network_student_score_summary
-- สรุปคะแนนรวมต่อนักศึกษา (ระดับเครือข่าย)
-- ============================================================
CREATE VIEW public.v_network_student_score_summary AS
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
FROM public.network_score_submissions
GROUP BY
  student_id, student_name, category, category_title,
  student_program, student_school, student_workplace, student_project;

COMMENT ON VIEW public.v_network_student_score_summary IS
  'สรุปคะแนนของนักศึกษาแต่ละคน (ระดับเครือข่าย)';


-- ============================================================
-- VIEW: v_network_category_score_summary
-- สรุปสถิติต่อ category (ระดับเครือข่าย)
-- ============================================================
CREATE VIEW public.v_network_category_score_summary AS
SELECT
  category,
  category_title,
  COUNT(*)::int              AS submission_count,
  COUNT(DISTINCT student_id) AS student_count,
  COUNT(DISTINCT judge_id)   AS judge_count,
  ROUND(AVG(score_pct), 3)   AS avg_pct,
  MAX(submitted_at)          AS last_updated
FROM public.network_score_submissions
GROUP BY category, category_title;

COMMENT ON VIEW public.v_network_category_score_summary IS
  'สถิติรวมต่อ category (ระดับเครือข่าย)';


-- ============================================================
-- VIEW: v_network_judge_submission_status
-- ดูว่ากรรมการแต่ละคนประเมินนักศึกษาใครบ้างแล้ว (ระดับเครือข่าย)
-- ============================================================
CREATE VIEW public.v_network_judge_submission_status AS
SELECT
  judge_id,
  judge_name,
  category,
  COUNT(*)::int           AS submitted_count,
  ARRAY_AGG(student_id ORDER BY submitted_at) AS submitted_student_ids,
  MAX(submitted_at)       AS last_submitted_at
FROM public.network_score_submissions
GROUP BY judge_id, judge_name, category;

COMMENT ON VIEW public.v_network_judge_submission_status IS
  'สถานะการส่งคะแนนของกรรมการแต่ละคน (ระดับเครือข่าย)';


-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
-- เปิด RLS บน network_score_submissions
ALTER TABLE public.network_score_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Service role bypass (Next.js API routes ใช้ service_role key)
-- Supabase service role bypasses RLS โดย default อยู่แล้ว

-- ============================================================
-- สรุป Objects ที่สร้าง
-- ============================================================
-- 1. ENUM: network_category_key
-- 2. TABLE: network_score_submissions
-- 3. VIEW: v_network_student_score_summary
-- 4. VIEW: v_network_category_score_summary
-- 5. VIEW: v_network_judge_submission_status
-- 6. INDEXES: 4 indexes สำหรับ query performance
-- ============================================================
