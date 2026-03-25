## ข้อความถึง Claude

โปรเจคนี้แบ่งหน้าที่ดังนี้:
- **Claude (AI/Agent)**: รับผิดชอบฝั่ง backend (API, logic, database, authentication ฯลฯ)
- **GitHub Copilot**: รับผิดชอบฝั่ง frontend (UI, UX, React/Next.js, การแสดงผล)

แนวทางการทำงานร่วมกัน:
- หากมีการเปลี่ยนแปลง API, โครงสร้างข้อมูล, หรือ endpoint ใหม่/แก้ไข endpoint เดิม รบกวนแจ้ง Copilot ด้วย เพื่อให้ UI สอดคล้องกับ backend
- หากมีการเพิ่มฟีเจอร์ใหม่ใน backend ช่วยอัปเดตเอกสารหรือแจ้งใน README/CLAUDE.md
- Copilot พร้อมปรับ UI ให้รองรับฟีเจอร์ใหม่ ๆ ที่ Claude เพิ่มเข้ามา

---

## Supabase Phase 1 Backend Migration (Completed)

### Architecture
- **Storage**: Supabase PostgreSQL with `score_submissions` table and 3 views
- **API Layer**: Next.js API routes using Supabase REST API (not JS client)
- **Auth**: Service role key bypasses RLS for server-side operations
- **Data Flow**: JSON files (students/judges) → API validation → Supabase upsert

### Key Files Modified
- `src/lib/supabase/server.ts` - Env resolution for SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL
- `src/lib/score-store/supabase.ts` - Full Supabase integration with upsert and view queries
- `src/app/api/submit/route.ts` - Enhanced validation before database upsert
- `src/app/api/dashboard/route.ts` - Reads from views for optimized dashboard data

### Database Schema
```sql
-- Main table
score_submissions (id, judge_id, student_id, category, scores jsonb, total_score, max_score, score_pct generated, submitted_at)

-- Views for dashboard
v_student_score_summary (aggregated per student)
v_category_score_summary (aggregated per category)  
v_judge_submission_status (judge progress tracking)
```

### Environment Variables Required
```env
NEXT_PUBLIC_SUPABASE_URL=https://sddegpoyqgqaipnnmblz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<from Supabase Dashboard>
```

### Important Constraints
- **student_id is NOT unique across categories** - must use (student_id, category) composite
- **upsert on conflict**: judge_id, student_id, category prevents duplicate submissions
- **scores stored as jsonb** - flexible question structure per category
- **RLS enabled** but service role bypasses automatically

### Migration Status
- ✅ Phase 1: Score submissions migrated to Supabase
- ⏸ Phase 2: Judges/Students tables (future - requires bcrypt password hashing)
- ⏸ Phase 3: Client-side Supabase client (future - requires RLS policies)

### Error Patterns to Watch
```
"Supabase server configuration is missing" → Check .env.local variables
"relation does not exist" → Run migration SQL first
"permission denied" → Using anon key instead of service role key
```

### Current Implementation Notes
- Uses raw `fetch()` to Supabase REST API - **no @supabase/supabase-js dependency needed**
- Maintains existing `DashboardData` contract - no UI changes required
- All operations server-side only - safe for production deployment

---

**ขอบคุณที่ร่วมมือกันครับ :)**
@AGENTS.md
