-- ============================================================
-- Phase 1: Score Submissions Table
-- ระบบลงคะแนนประกวดสหกิจ — WU Coop Award System
-- ============================================================
-- เป้าหมาย: ย้ายที่เก็บผลการประเมินจาก Google Sheets → Supabase
-- students.json และ judges.json ยังคงอยู่ใน JSON (Phase 2 จะ migrate)
-- ============================================================

-- Enable UUID extension (usually pre-enabled on Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM: category
-- ตรงกับ CategoryKey ใน src/lib/assessment-config.ts
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'category_key') THEN
    CREATE TYPE public.category_key AS ENUM (
      'sci-tech',
      'social-huma',
      'innovation',
      'inter'
    );
  END IF;
END $$;

-- ============================================================
-- TABLE: score_submissions
-- เก็บผลการประเมินของกรรมการแต่ละคนต่อนักศึกษาแต่ละคน
-- ============================================================
DROP TABLE IF EXISTS public.score_submissions CASCADE;
DROP VIEW IF EXISTS public.v_student_score_summary CASCADE;
DROP VIEW IF EXISTS public.v_category_score_summary CASCADE;
DROP VIEW IF EXISTS public.v_judge_submission_status CASCADE;

CREATE TABLE public.score_submissions (
  -- Primary Key
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Judge Info (denormalized จาก judges.json — Phase 2 จะเป็น FK) ──
  judge_id          text NOT NULL,
  judge_name        text NOT NULL,
  judge_dept        text NOT NULL,

  -- ── Student Info (denormalized จาก students.json — Phase 2 จะเป็น FK) ──
  -- หมายเหตุ: student_id ใน JSON ไม่ unique ข้าม category (S001 มีใน sci-tech, innovation ฯลฯ)
  -- ต้องใช้ (student_id, category) คู่กันเสมอ
  student_id        text NOT NULL,
  student_name      text NOT NULL,
  student_program   text NOT NULL DEFAULT '',
  student_school    text NOT NULL DEFAULT '',
  student_workplace text NOT NULL DEFAULT '',
  student_project   text NOT NULL DEFAULT '',

  -- ── Category ──
  category          public.category_key NOT NULL,
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
  CONSTRAINT uq_judge_student_category
    UNIQUE (judge_id, student_id, category)
);

-- ── Indexes ──
-- Dashboard query: ดูคะแนนรวมทุก student ใน category
CREATE INDEX idx_submissions_category        ON public.score_submissions (category);
-- Query: กรรมการคนนี้ประเมินใครบ้าง
CREATE INDEX idx_submissions_judge_id        ON public.score_submissions (judge_id);
-- Query: นักศึกษาคนนี้ได้คะแนนอะไรบ้าง
CREATE INDEX idx_submissions_student_cat     ON public.score_submissions (student_id, category);
-- Dashboard sort by time
CREATE INDEX idx_submissions_submitted_at    ON public.score_submissions (submitted_at DESC);

-- ── Comment ──
COMMENT ON TABLE public.score_submissions IS
  'ผลการประเมินผลงานสหกิจ — 1 row = กรรมการ 1 คน ประเมินนักศึกษา 1 คน';
COMMENT ON COLUMN public.score_submissions.scores IS
  'คะแนนรายข้อ เช่น {"q1_1": 4, "q1_2": 5} ตาม assessment-config.ts';
COMMENT ON COLUMN public.score_submissions.score_pct IS
  'คะแนนเป็น % = (total_score / max_score) * 100 (computed, stored)';
COMMENT ON COLUMN public.score_submissions.student_id IS
  'student_id จาก students.json — ไม่ unique ข้าม category ต้องใช้คู่กับ category เสมอ';


-- ============================================================
-- VIEW: v_student_score_summary
-- สรุปคะแนนรวมต่อนักศึกษา — ใช้แทน logic ใน dashboard/route.ts
-- ============================================================
CREATE VIEW public.v_student_score_summary AS
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
FROM public.score_submissions
GROUP BY
  student_id, student_name, category, category_title,
  student_program, student_school, student_workplace, student_project;

COMMENT ON VIEW public.v_student_score_summary IS
  'สรุปคะแนนของนักศึกษาแต่ละคน — ใช้แทน byStudent logic ใน dashboard/route.ts';


-- ============================================================
-- VIEW: v_category_score_summary
-- สรุปสถิติต่อ category — ใช้แทน byCategory logic ใน dashboard/route.ts
-- ============================================================
CREATE VIEW public.v_category_score_summary AS
SELECT
  category,
  category_title,
  COUNT(*)::int              AS submission_count,
  COUNT(DISTINCT student_id) AS student_count,
  COUNT(DISTINCT judge_id)   AS judge_count,
  ROUND(AVG(score_pct), 3)   AS avg_pct,
  MAX(submitted_at)          AS last_updated
FROM public.score_submissions
GROUP BY category, category_title;

COMMENT ON VIEW public.v_category_score_summary IS
  'สถิติรวมต่อ category — ใช้แทน byCategory logic ใน dashboard/route.ts';


-- ============================================================
-- VIEW: v_judge_submission_status
-- ดูว่ากรรมการแต่ละคนประเมินนักศึกษาใครบ้างแล้ว
-- ============================================================
CREATE VIEW public.v_judge_submission_status AS
SELECT
  judge_id,
  judge_name,
  category,
  COUNT(*)::int           AS submitted_count,
  ARRAY_AGG(student_id ORDER BY submitted_at) AS submitted_student_ids,
  MAX(submitted_at)       AS last_submitted_at
FROM public.score_submissions
GROUP BY judge_id, judge_name, category;

COMMENT ON VIEW public.v_judge_submission_status IS
  'สถานะการส่งคะแนนของกรรมการแต่ละคน — ใช้ตรวจสอบว่าประเมินครบหรือยัง';


-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
-- เปิด RLS บน score_submissions
ALTER TABLE public.score_submissions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Service role bypass (Next.js API routes ใช้ service_role key)
-- Supabase service role bypasses RLS โดย default อยู่แล้ว — ไม่ต้องสร้าง policy เพิ่ม

-- Policy 2: ไม่อนุญาต anon/authenticated access โดยตรง
-- (API routes ทั้งหมดอยู่ server-side และใช้ service_role key)
-- ถ้าในอนาคตต้องการให้ client-side อ่าน dashboard ได้ ให้ uncomment ด้านล่าง:

-- CREATE POLICY "allow_anon_select_submissions"
--   ON public.score_submissions
--   FOR SELECT
--   TO anon
--   USING (true);

-- ============================================================
-- PHASE 2 STUB: judges + students tables (commented out)
-- uncomment และ run เป็น migration แยกเมื่อพร้อม migrate จาก JSON
-- ============================================================

/*

-- ── Phase 2a: judges table ──
CREATE TABLE public.judges (
  id              text PRIMARY KEY,       -- J001, J002, ...
  name            text NOT NULL,
  dept            text NOT NULL,
  password_hash   text NOT NULL,          -- bcrypt hash, ห้ามเก็บ plain text
  categories      public.category_key[] NOT NULL DEFAULT '{}',
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

COMMENT ON COLUMN public.judges.password_hash IS
  'bcrypt hash ของ password — ห้ามเก็บ plain text ที่อยู่ใน judges.json';

-- ── Phase 2b: students table ──
CREATE TABLE public.students (
  uid             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      text NOT NULL,          -- S001, S002, ...
  category        public.category_key NOT NULL,
  name            text NOT NULL,
  program         text NOT NULL DEFAULT '',
  school          text NOT NULL DEFAULT '',
  phone           text,
  line_id         text,
  workplace       text NOT NULL DEFAULT '',
  project         text NOT NULL DEFAULT '',
  thai_category   text,
  created_at      timestamptz DEFAULT now(),
  -- student_id unique เฉพาะใน category เดียวกัน
  CONSTRAINT uq_student_id_category UNIQUE (student_id, category)
);

-- ── Phase 2c: เพิ่ม FK constraints บน score_submissions ──
ALTER TABLE public.score_submissions
  ADD CONSTRAINT fk_judge_id
    FOREIGN KEY (judge_id) REFERENCES public.judges (id)
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- FK สำหรับ students ต้องใช้ composite key
-- Postgres ไม่รองรับ FK ไปยัง non-PK ได้ตรงๆ ต้องผ่าน unique constraint
ALTER TABLE public.score_submissions
  ADD CONSTRAINT fk_student_id_category
    FOREIGN KEY (student_id, category)
    REFERENCES public.students (student_id, category)
    ON DELETE RESTRICT ON UPDATE CASCADE;

*/
