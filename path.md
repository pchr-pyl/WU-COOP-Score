# 📊 Project: WU COOP Score System
**Domain:** `wucoopscore.vercel.app`
**Platform:** Web Application (Form & Dashboard)
**Tech Stack:** Next.js, Tailwind CSS, Google Sheets API, Vercel

---

## 🔗 URL Structure (Routing)
ระบบจะแบ่งออกเป็นหน้าประเมินแยกตามประเภท และหน้า Dashboard สรุปผล ดังนี้:

| ประเภทแบบประเมิน | Path (URL) | รายละเอียด |
| :--- | :--- | :--- |
| **วิทยาศาสตร์และเทคโนโลยี** | `/sci-tech` | แบบประเมินด้าน Science & Technology |
| **สังคมศาสตร์ มนุษยศาสตร์** | `/social-huma` | แบบประเมินด้าน Social Sciences & Humanities |
| **นวัตกรรมดีเด่น** | `/innovation` | แบบประเมินด้าน Innovation |
| **นานาชาติดีเด่น** | `/inter` | แบบประเมินด้าน International Achievement |
| **หน้าสรุปผลรวม** | `/dashboard` | **หน้า Dashboard แสดงคะแนนรวมทุกประเภท** |

---

## 🛠 Tech Stack Details

### 1. Frontend
* **Next.js 14+ (App Router):** จัดการ Routing และ Server-side Rendering
* **Tailwind CSS:** ตกแต่ง UI ให้รวดเร็วและสวยงาม
* **Shadcn/UI:** สำหรับ Form Components (Input, Radio Group, Button) และ Card ในหน้า Dashboard
* **Recharts:** แสดงผล Data Visualization (Bar Chart, Pie Chart) ในหน้าสรุปผล

### 2. Database & API
* **Google Sheets:** ใช้เป็นฐานข้อมูลหลัก (ง่ายต่อการตรวจสอบและ Export ของเจ้าหน้าที่)
* **Google Cloud Service Account:** ใช้สำหรับ Authen เพื่อเขียน/อ่านข้อมูลจาก Sheet
* **Zod:** ใช้ตรวจสอบความถูกต้องของข้อมูล (Validation) ก่อนส่งลง Google Sheets

---

## 📑 Database Schema (Google Sheets Columns)
แนะนำให้สร้าง Sheet แยก Tab ตามประเภท หรือใช้ Sheet เดียวกันแล้วมี Column `Category` กำกับ:

| Timestamp | Student ID | Name | Category | Score_Q1 | Score_Q2 | ... | Total_Score |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 24/03/2026 | 641XXXX | นายสมชาย | sci-tech | 5 | 4 | ... | 45 |

---

## 🚀 แผนการพัฒนา (Roadmap)

### Phase 1: Setup & Connection
1. สร้างโปรเจค Next.js และติดตั้ง Tailwind + Shadcn/UI
2. สร้าง Google Service Account และแชร์สิทธิ์ Google Sheet ให้ Email นั้น
3. เขียน API Route ใน Next.js (`/api/submit`) เพื่อรับข้อมูลจากฟอร์มส่งไป Google Sheets

### Phase 2: Form Development
1. สร้าง **Dynamic Route** `app/[type]/page.tsx` เพื่อรองรับ Path ทั้ง 4 ประเภท
2. ออกแบบฟอร์มประเมินให้รองรับเกณฑ์คะแนน (Rating Scale 1-5)

### Phase 3: Dashboard Development (`/dashboard`)
1. เขียนฟังก์ชันดึงข้อมูลจาก Google Sheets ทั้งหมดมาประมวลผล
2. สร้างหน้า Dashboard สรุปผล:
   - **Metric Cards:** แสดงจำนวนคนประเมินแต่ละประเภท
   - **Leaderboard:** อันดับคะแนนสูงสุดของแต่ละหมวด
   - **Bar Chart:** เปรียบเทียบคะแนนเฉลี่ยระหว่างคณะหรือประเภทงาน

---

## 💡 Pro Tips for WU COOP
* **Validation:** อย่าลืมเช็ค Student ID ป้องกันการส่งซ้ำ
* **Export:** เนื่องจากข้อมูลอยู่ใน Google Sheets อยู่แล้ว เจ้าหน้าที่สามารถกด Download เป็น Excel ได้ทันทีเมื่อจบโครงการ
* **Real-time:** หน้า Dashboard สามารถตั้งค่าให้ Refresh ข้อมูลทุกๆ 1-5 นาที เพื่อความสดใหม่ของข้อมูล