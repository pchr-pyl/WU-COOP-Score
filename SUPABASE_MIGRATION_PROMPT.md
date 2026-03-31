# Prompt: สร้าง Migration ใหม่สำหรับ Supabase

## เป้าหมาย
สร้าง migration file ใหม่เพื่อสร้างตารางฐานข้อมูลใหม่ที่ไม่ชนกับตารางเดิม โดยเพิ่ม prefix `v2_` ให้กับทุก object

## ขั้นตอนการทำงาน

### 1. สร้าง Migration File ใหม่
```bash
cd supabase
npx supabase migration new v2_score_submissions
```

### 2. คัดลอกและแก้ไข Schema

คัดลอกเนื้อหาจากไฟล์ `supabase/migrations/20260325000001_phase1_score_submissions.sql` แล้วแก้ไขดังนี้:

#### เปลี่ยนชื่อ Objects ทั้งหมด:
- `category_key` → `v2_category_key`
- `score_submissions` → `v2_score_submissions`
- `v_student_score_summary` → `v2_student_score_summary`
- `v_category_score_summary` → `v2_category_score_summary`
- `v_judge_submission_status` → `v2_judge_submission_status`

#### ตัวอย่างการแก้ไข:

**ENUM Type:**
```sql
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
```

**Table:**
```sql
DROP TABLE IF EXISTS public.v2_score_submissions CASCADE;
DROP VIEW IF EXISTS public.v2_student_score_summary CASCADE;
DROP VIEW IF EXISTS public.v2_category_score_summary CASCADE;
DROP VIEW IF EXISTS public.v2_judge_submission_status CASCADE;

CREATE TABLE public.v2_score_submissions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_id          text NOT NULL,
  judge_name        text NOT NULL,
  judge_dept        text NOT NULL,
  student_id        text NOT NULL,
  student_name      text NOT NULL,
  student_program   text NOT NULL DEFAULT '',
  student_school    text NOT NULL DEFAULT '',
  student_workplace text NOT NULL DEFAULT '',
  student_project   text NOT NULL DEFAULT '',
  category          public.v2_category_key NOT NULL,
  category_title    text NOT NULL,
  scores            jsonb NOT NULL DEFAULT '{}',
  total_score       numeric(7, 2) NOT NULL CHECK (total_score >= 0),
  max_score         numeric(7, 2) NOT NULL CHECK (max_score > 0),
  score_pct         numeric(6, 3) GENERATED ALWAYS AS (
                      ROUND((total_score / max_score) * 100, 3)
                    ) STORED,
  submitted_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_v2_judge_student_category
    UNIQUE (judge_id, student_id, category)
);
```

**Indexes:**
```sql
CREATE INDEX idx_v2_submissions_category        ON public.v2_score_submissions (category);
CREATE INDEX idx_v2_submissions_judge_id        ON public.v2_score_submissions (judge_id);
CREATE INDEX idx_v2_submissions_student_cat     ON public.v2_score_submissions (student_id, category);
CREATE INDEX idx_v2_submissions_submitted_at    ON public.v2_score_submissions (submitted_at DESC);
```

**Views:**
```sql
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

CREATE VIEW public.v2_judge_submission_status AS
SELECT
  judge_id,
  judge_name,
  category,
  COUNT(*)::int           AS submitted_count,
  ARRAY_AGG(student_id ORDER BY submitted_at) AS submitted_student_ids,
  MAX(submitted_at)       AS last_submitted_at
FROM public.v2_score_submissions
GROUP BY judge_id, judge_name, category;
```

**RLS:**
```sql
ALTER TABLE public.v2_score_submissions ENABLE ROW LEVEL SECURITY;
```

### 3. Run Migration
```bash
npx supabase db push
```

หรือถ้าใช้ Supabase CLI แบบเต็ม:
```bash
npx supabase migration up
```

### 4. ตรวจสอบผลลัพธ์

เข้าไปดูใน Supabase Dashboard → Table Editor ว่ามีตารางใหม่:
- `v2_score_submissions`
- `v2_student_score_summary` (view)
- `v2_category_score_summary` (view)
- `v2_judge_submission_status` (view)

และมี ENUM type ใหม่:
- `v2_category_key`

## หมายเหตุสำคัญ

1. ตารางเดิม (`score_submissions`) จะยังคงอยู่และไม่ถูกแก้ไข
2. ตารางใหม่ (`v2_score_submissions`) จะเป็นตารางว่างพร้อมใช้งาน
3. ต้องแก้ไข API routes ใน `src/app/api/` ให้ชี้ไปที่ตารางใหม่ภายหลัง
4. ไฟล์ `judges.json` และ `students.json` ยังคงใช้งานได้ตามเดิม

## ไฟล์ที่ต้องแก้ไขภายหลัง (ไม่ต้องทำตอนนี้)

เมื่อ migration สำเร็จแล้ว จะต้องแก้ไขไฟล์เหล่านี้ให้ชี้ไปที่ตารางใหม่:
- `src/lib/score-store/supabase.ts`
- `src/app/api/submit/route.ts`
- `src/app/api/dashboard/route.ts`

แต่ยังไม่ต้องทำตอนนี้ รอให้ migration สำเร็จก่อน
