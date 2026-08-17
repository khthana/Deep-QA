# DEEP-Core — Database Schema

> สกัดจากปริญญานิพนธ์ **CE68-25 DEEP-Core** §3.5 "การออกแบบฐานข้อมูล" (ตาราง 3.3–3.34, รูป 3.78–3.84)
> DBMS: **PostgreSQL** · Timezone ค่าเริ่มต้น: `Asia/Bangkok`
> ER Diagram อยู่ในไฟล์แยก → [`03-er-diagram.md`](./03-er-diagram.md)

> **เอกสารนี้บรรยายสิ่งที่ส่งมอบ ไม่ได้กำหนดสิ่งที่จะสร้าง** — ทุกจุดที่ schema ของ rebuild ไม่ตรงกับหัวข้อ 1–8
> ถูกบันทึกไว้ที่ **หัวข้อ 10 "การเบี่ยงเบนของ rebuild"** ท้ายไฟล์ อ่านหัวข้อนั้นก่อนยึดตารางใดในเอกสารนี้

## สารบัญตาราง

| กลุ่ม | ตาราง |
|---|---|
| ผู้ใช้งานและสิทธิ์ | `users`, `roles`, `user_role`, `user_log`, `user_image` |
| โครงสร้างองค์กร | `faculty`, `departments`, `programs` |
| นักศึกษา | `student`, `student_course`, `student_group`, `student_group_member`, `student_group_change_log` |
| รายวิชา / การเปิดสอน | `subjects`, `program_subjects`, `semester_courses`, `course_sections`, `course_sections_teacher`, `course_syllabus` |
| ผลการเรียนรู้ | `learning_outcomes`, `subject_plo_mapping`, `subject_clo`, `subject_clo_measurable_behavior`, `subject_clo_achievement_criteria`, `clo_course_cycle_cloplan`, `clo_course_cycle_detail_cloplan` |
| กิจกรรมและคะแนน | `subject_score_ratio`, `activities`, `activity_clo_mapping`, `activity_scores`, `activity_evidence` |
| Rubric | `rubrics`, `rubric_detail` |

**สัญลักษณ์:** PK = Primary Key · FK = Foreign Key · NN = Not Null · U(n) = Unique constraint กลุ่มที่ n · AI = Auto Increment

---

## 1. กลุ่มผู้ใช้งานและสิทธิ์

### 1.1 `users` — ข้อมูลผู้ใช้งาน (ตาราง 3.3)

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `user_id` | Varchar(8) | PK | รหัสผู้ใช้งาน (รหัสนักศึกษา / รหัสบุคลากร) |
| `email` | Varchar(100) | Unique, NN | อีเมล (ต้องเป็นโดเมน `@kmitl.ac.th` สำหรับ OAuth) |
| `phone` | Varchar(30) | | เบอร์โทรศัพท์ |
| `title_th` | Varchar(50) | | คำนำหน้า (ไทย) |
| `first_name_th` | Varchar(100) | | ชื่อ (ไทย) |
| `last_name_th` | Varchar(100) | | นามสกุล (ไทย) |
| `title_en` | Varchar(50) | NN | คำนำหน้า (อังกฤษ) |
| `first_name_en` | Varchar(100) | NN | ชื่อ (อังกฤษ) |
| `last_name_en` | Varchar(100) | NN | นามสกุล (อังกฤษ) |
| `department_id` | Char(2) | FK → `departments` | ภาควิชาที่สังกัด |
| `program_id` | Varchar(10) | FK → `programs` | หลักสูตรที่สังกัด |
| `status` | `status_enum` | default `'active'` | สถานะบัญชี |
| `is_verified` | Boolean | | สถานะการยืนยันตัวตน (ปรากฏใน ERD รูป 3.79) |
| `verification_token` | Varchar(255) | | Token สำหรับยืนยันอีเมล |
| `password` | Varchar(255) | | รหัสผ่านที่ถูก hash (อย่างน้อย 8 ตัวอักษร) |
| `created_at` | Timestamp | default now() `Asia/Bangkok` | |
| `updated_at` | Timestamp | default now() `Asia/Bangkok` | |

### 1.2 `roles` — บทบาท (ตาราง 3.4)

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `role_id` | Varchar(20) | PK | รหัสบทบาท เช่น `STUDENT`, `TEACHER`, `FULL_ADMIN` |
| `role_name` | Varchar(20) | NN | ชื่อบทบาท |
| `priority` | Integer | NN | ลำดับความสำคัญ (ใช้เลือกบทบาทเริ่มต้นหลัง login — BR-03) |

### 1.3 `user_role` — การมอบสิทธิ์ผู้ใช้งาน (ตาราง 3.5)

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `id` | Integer | PK, AI | |
| `user_id` | Varchar(8) | FK → `users`, NN | ผู้ใช้งาน |
| `role_id` | Varchar(20) | FK → `roles` | บทบาท |
| `scope_id` | Varchar(10) | | ขอบเขตสิทธิ์ (คณะ / ภาควิชา / หลักสูตร) |
| `assigned_at` | Timestamp with TZ | default `Asia/Bangkok` | เวลาที่มอบสิทธิ์ |
| `assigned_by` | Varchar(8) | FK → `users` | ผู้มอบสิทธิ์ (ใช้ตรวจ R006) |
| `is_active` | Boolean | default `true` | สถานะสิทธิ์ |

> รองรับ R003 (1 ผู้ใช้หลายบทบาท) และ R004/R006 (จำกัดขอบเขต & สิทธิ์ไม่เกินผู้มอบ)

### 1.4 `user_log` — บันทึกการใช้งาน (ตาราง 3.6)

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `id` | Integer | PK, AI | |
| `user_id` | Varchar(8) | FK → `users`, NN | |
| `activity` | Varchar(20) | NN | `LOGIN` / `LOGOUT` / `VIEW` |
| `time_stamp` | Timestamp | default now() `Asia/Bangkok` | |

### 1.5 `user_image` — รูปโปรไฟล์ผู้ใช้งาน (**เล่มไม่ได้บันทึกไว้**)

ตารางเดียวในเอกสารนี้ที่ไม่มีตารางในเล่มรองรับ — หมายเหตุท้ายหัวข้อ 9 บันทึกแค่ว่ามีอยู่ ไม่ได้ให้คอลัมน์
รูปร่างด้านล่างจึงกู้จาก SQL ที่โค้ดเดิมส่งจริงล้วน ๆ ไม่ใช่จากเล่ม:

- `services/userService.js:374` — `SELECT * FROM user_image WHERE user_id = $1`
- `services/userService.js:383` — `INSERT ... ON CONFLICT (user_id) DO UPDATE SET image_path = EXCLUDED.image_path`
- `models/userModel.js:404` — `LEFT JOIN user_image ui ON ui.user_id = u.user_id` เพื่ออ่าน `ui.image_path`
- `controllers/userController.js:406` — เขียนไฟล์ลงดิสก์แล้วเก็บ path `/user_image/<user_id>_<timestamp><ext>`

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `user_id` | `varchar(20)` | PK, FK → `users` `ON DELETE CASCADE` | หนึ่งรูปต่อหนึ่งผู้ใช้ — PK เดี่ยวคือ unique constraint ที่ `ON CONFLICT (user_id)` ต้องใช้ ไม่งั้นได้ 42P10 |
| `image_path` | `text` | NN | path ใต้ evidence root ไม่ใช่ตัวไฟล์ |

ไม่มี `created_at` / `updated_at` โดยตั้งใจ — ทางเขียนเดียวคือ upsert ข้างบน ซึ่งเซ็ตแค่ `image_path`
timestamp จึงจะถูกแค่การอัปโหลดครั้งแรกและผิดตั้งแต่ครั้งที่สองเป็นต้นไป ดู
[`0004_user_profile_image.sql`](../db/migrations/0004_user_profile_image.sql) และตั๋ว
[#46](https://github.com/khthana/Deep-QA/issues/46)

---

## 2. กลุ่มโครงสร้างองค์กร

### 2.1 `faculty` — คณะ (ตาราง 3.7)

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `faculty_id` | Varchar(10) | PK | รหัสคณะ |
| `faculty_name_en` | Varchar(200) | NN | ชื่อคณะ (อังกฤษ) |
| `faculty_name_th` | Varchar(200) | NN | ชื่อคณะ (ไทย) |
| `is_active` | Boolean | default `true` | |

### 2.2 `departments` — ภาควิชา (ตาราง 3.8)

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `department_id` | Varchar(2) | PK | รหัสภาควิชา เช่น `05` |
| `department_name_en` | Varchar(200) | | ชื่อภาควิชา (อังกฤษ) |
| `department_name_th` | Varchar(200) | | ชื่อภาควิชา (ไทย) |
| `faculty_id` | Varchar(10) | FK → `faculty` | คณะที่สังกัด |
| `is_active` | Boolean | default `true` | |

### 2.3 `programs` — หลักสูตร (ตาราง 3.9)

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `program_id` | Varchar(10) | PK, NN | รหัสหลักสูตร เช่น `0501` |
| `program_name_en` | Varchar(200) | | ชื่อหลักสูตร (อังกฤษ) |
| `program_name_th` | Varchar(200) | | ชื่อหลักสูตร (ไทย) |
| `department_id` | Varchar(2) | FK → `departments` | ภาควิชาที่สังกัด |
| `year` | Varchar(4) | | ปีการศึกษาของหลักสูตร (พ.ศ.) |
| `is_active` | Boolean | default `true` | ใช้ทำ soft-delete ตาม R019 |
| `created_at` / `updated_at` | Timestamp | | |

---

## 3. กลุ่มนักศึกษา

### 3.1 `student` — ข้อมูลนักศึกษา (ตาราง 3.10)

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `student_id` | Varchar(8) | PK, FK → `users` | รหัสนักศึกษา |
| `first_name_th` | Varchar(100) | NN | ชื่อ (ไทย) |
| `last_name_th` | Varchar(100) | NN | นามสกุล (ไทย) |
| `full_name_th` | Varchar(200) | **Generated** | ชื่อ-นามสกุลเต็ม (คำนวณอัตโนมัติ) |
| `department_id` | Varchar(2) | FK → `departments`, NN | |
| `program_id` | Varchar(10) | FK → `programs`, NN | |
| `admission_year` | Varchar(4) | **Generated** | ปีที่รับเข้า = 2 หลักแรกของรหัสนักศึกษา + 2500 |
| `status` | `student_status_enum` | default `'active'` | `active`, `inactive`, `graduated`, `suspended` |
| `created_at` / `updated_at` | Timestamp | | |

### 3.2 `student_course` — นักศึกษาในรายวิชา (ตาราง 3.11)

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `section_id` | Integer | PK, FK → `course_sections`, NN | กลุ่มเรียน |
| `student_id` | Varchar(8) | PK, FK → `student`, NN | นักศึกษา |
| `created_at` / `updated_at` | Timestamp | | |

> Composite PK (`section_id`, `student_id`) — กันการลงทะเบียนซ้ำ

### 3.3 `student_group` — กลุ่มงานนักศึกษา (ตาราง 3.12)

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `group_id` | Integer | PK, AI | |
| `group_name` | Varchar(100) | default `''` | ชื่อกลุ่ม |
| `section_id` | Integer | FK → `course_sections` | กลุ่มเรียนที่กลุ่มงานสังกัด |
| `created_at` / `updated_at` | Timestamp | | |

### 3.4 `student_group_member` — สมาชิกกลุ่มงาน (ตาราง 3.13)

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `group_id` | Integer | PK, FK → `student_group`, NN | |
| `student_id` | Varchar(8) | PK, FK → `student`, NN | |
| `created_at` | Timestamp | | |

> ข้อจำกัดระดับ Business Logic: ≤ 10 คน/กลุ่ม (BR-06) และนักศึกษา 1 คนอยู่ได้ 1 กลุ่มต่อรายวิชา (BR-07)

### 3.5 `student_group_change_log` — ประวัติการเปลี่ยนแปลงกลุ่ม (ตาราง 3.34)

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `log_id` | Integer | PK, AI | |
| `group_id` | Smallint | NN | กลุ่มที่เกิดเหตุการณ์ |
| `group_name` | Varchar(100) | NN | ชื่อกลุ่ม ณ ขณะนั้น |
| `student_id` | Varchar(8) | FK → `student` | นักศึกษาที่เกี่ยวข้อง |
| `action_type` | Varchar(20) | CHECK | `CREATE_GROUP`, `DELETE_GROUP`, `ADD_STUDENT`, `REMOVE_STUDENT`, `MOVE_STUDENT` |
| `old_group_id` | Smallint | FK → `student_group` | กลุ่มเดิม (กรณี MOVE) |
| `new_group_id` | Smallint | FK → `student_group` | กลุ่มใหม่ (กรณี MOVE) |
| `performed_by` | Varchar(50) | FK → `users` | ผู้ดำเนินการ |
| `section_id` | Integer | FK → `course_sections`, NN | |
| `created_at` | Timestamp | default CURRENT_TIMESTAMP | |

---

## 4. กลุ่มรายวิชาและการเปิดสอน

### 4.1 `subjects` — รายวิชา (ตาราง 3.14)

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `subject_id` | Varchar(20) | PK, NN | รหัสวิชา เช่น `01076105` |
| `subject_name_en` | Varchar(200) | NN | ชื่อวิชา (อังกฤษ) |
| `subject_name_th` | Varchar(200) | NN | ชื่อวิชา (ไทย) |
| `credits` | Integer | NN | หน่วยกิต |
| `description_th` | Text | | คำอธิบายรายวิชา (ไทย) |
| `description_en` | Text | | คำอธิบายรายวิชา (อังกฤษ) |
| `department_id` | Varchar(20) | FK → `departments` | ภาควิชาเจ้าของรายวิชา |
| `is_active` | Boolean | default `true` | |
| `created_by` / `updated_by` | Varchar(8) | FK → `users` | |
| `created_at` / `updated_at` | Timestamp | | |

### 4.2 `program_subjects` — รายวิชาในหลักสูตร (ตาราง 3.15)

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `id` | Integer | PK, AI | |
| `program_id` | Varchar(10) | FK → `programs`, U(1) | |
| `subject_id` | Varchar(20) | FK → `subjects`, U(1) | |
| `subject_type` | `subject_type_enum` | NN | `required` (บังคับ) / `elective` (เลือก) |
| `is_active` | Boolean | default `true` | soft-delete ตาม R030 |
| `created_by` / `updated_by` | Varchar(20) | FK → `users` | |
| `created_at` / `updated_at` | Timestamp | | |

### 4.3 `semester_courses` — การเปิดรายวิชาในภาคการศึกษา (ตาราง 3.16)

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `id` | Integer | PK, AI | |
| `academic_year` | Varchar(4) | NN | ปีการศึกษา (พ.ศ.) |
| `semester` | Smallint | NN | ภาคการศึกษา: `1`, `2`, `3` |
| `subject_id` | Varchar(8) | FK → `subjects`, NN | |
| `program_id` | Varchar(10) | FK → `programs`, NN | |
| `created_at` / `updated_at` | Timestamp | | |

### 4.4 `course_sections` — กลุ่มเรียน (ตาราง 3.17)

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `section_id` | Integer | PK, AI | |
| `semester_course_id` | Integer | FK → `semester_courses`, NN | |
| `section_number` | Varchar(10) | Unique, NN | หมายเลขกลุ่มเรียน |
| `created_at` / `updated_at` | Timestamp | | |

### 4.5 `course_sections_teacher` — อาจารย์ผู้สอนประจำกลุ่มเรียน (ตาราง 3.18)

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `id` | Integer | PK, AI | |
| `section_id` | Integer | FK → `course_sections`, NN | |
| `user_id` | Varchar(8) | FK → `users`, NN | อาจารย์ผู้สอน |
| `semester_course_id` | Integer | FK → `semester_courses`, NN | |
| `created_at` / `updated_at` | Timestamp | | |

> รองรับ R035 — 1 กลุ่มเรียนมีอาจารย์ผู้สอนได้หลายคน

### 4.6 `course_syllabus` — แผนการสอน (ตาราง 3.19)

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `id` | Integer | PK, Generated Always | |
| `section_id` | Integer | FK → `course_sections` | |
| `week_no` | Smallint | NN | สัปดาห์ที่ |
| `title` | Text | | หัวข้อการสอน |
| `description` | Text | | รายละเอียด |
| `remark` | Text | | หมายเหตุ |
| `created_by` | Varchar(8) | FK → `users` | |
| `created_at` / `updated_at` | Timestamp | | |

---

## 5. กลุ่มผลการเรียนรู้

### 5.1 `learning_outcomes` — ผลการเรียนรู้ระดับหลักสูตร PLO (ตาราง 3.20)

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `outcome_id` | Integer | PK, AI | |
| `program_id` | Varchar(10) | FK → `programs`, NN | |
| `outcome_code` | Varchar(50) | Unique, NN | เช่น `PLO1`, `PLO2-1` |
| `outcome_title` | Varchar(500) | NN | ชื่อผลการเรียนรู้ |
| `outcome_description` | Text | | รายละเอียด |
| `outcome_type` | Enum | NN | `knowledge`, `skills`, `ethics`, `character` |
| `parent_outcome_id` | Integer | FK → `learning_outcomes` (self) | โครงสร้างต้นไม้ ข้อหลัก–ข้อย่อย (R039) |
| `sequence_order` | Integer | NN | ลำดับการแสดงผล |
| `level_depth` | Smallint | default `1` | ระดับชั้น (root = 1) |
| `is_expanded` | Boolean | default `false` | สถานะการกางข้อย่อยบน UI |
| `is_active` | Boolean | default `true` | |
| `created_by` / `updated_by` | Varchar(20) | FK → `users` | |
| `created_at` / `updated_at` | Timestamp | | |

### 5.2 `subject_plo_mapping` — การเชื่อมโยง PLO กับรายวิชา (ตาราง 3.21)

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `mapping_id` | Integer | PK, AI | |
| `program_id` | Varchar(10) | NN | |
| `subject_id` | Varchar(20) | FK → `subjects`, U(1) | |
| `outcome_id` | Integer | FK → `learning_outcomes`, U(1) | |
| `mapping_level` | Enum | default `'E'` | `I` Introduced, `D` Developed, `P` Practiced, `A` Assessed, `E` Empty |
| `created_by` / `updated_by` | Varchar(8) | FK → `users` | |
| `created_at` / `updated_at` | Timestamp | | |

### 5.3 `subject_clo` — ผลการเรียนรู้ระดับรายวิชา CLO (ตาราง 3.22)

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `clo_id` | Integer | PK, AI | |
| `clo_number` | Varchar(50) | Unique, NN | เช่น `CLO1` |
| `clo_detail` | Text | | รายละเอียดผลการเรียนรู้ |
| `teaching_method` | Text | | วิธีการสอน |
| `assessment_method` | Text | | วิธีการประเมินผล |
| `section_id` | Integer | FK → `course_sections`, NN | |
| `plo_id` | Integer | FK → `learning_outcomes` | PLO ที่เชื่อมโยง (R041) |
| `created_by` | Varchar(8) | FK → `users` | |
| `created_at` / `updated_at` | Timestamp | | |

### 5.4 `subject_clo_measurable_behavior` — พฤติกรรมที่วัดผลได้ของ CLO (ตาราง 3.23)

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `id` | Integer | PK, AI | |
| `clo_id` | Smallint | FK → `subject_clo`, NN | |
| `behavior_no` | Smallint | NN | ลำดับที่ |
| `learning_activity` | Enum | NN | ประเภทกิจกรรม: `Quiz`, `exam`, `homework` (R063) |
| `behavior_detail` | Text | NN | รายละเอียดพฤติกรรม |
| `cognitive_level` | Enum | NN | ระดับพุทธิพิสัย: `remember`, `understand`, `apply`, `analyze` … (R064) |
| `section_id` | Integer | FK → `course_sections` | |
| `created_at` / `updated_at` | Timestamp | | |

### 5.5 `subject_clo_achievement_criteria` — เกณฑ์ระดับการบรรลุผล (ตาราง 3.24)

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `id` | Integer | PK, AI | |
| `clo_id` | Smallint | FK → `subject_clo`, NN | |
| `criteria_no` | Smallint | NN | ลำดับที่ |
| `achievement_level` | Varchar(20) | CHECK | `ดีเยี่ยม`, `ดี`, `พอใช้`, `ต้องปรับปรุง` (R065) |
| `criteria_detail` | Text | NN | เกณฑ์การประเมิน |
| `criteria_description` | Text | | คำอธิบายเพิ่มเติม |
| `section_id` | Integer | FK → `course_sections` | |
| `created_at` / `updated_at` | Timestamp | | |

### 5.6 `clo_course_cycle_cloplan` — รอบการปรับปรุงอย่างต่อเนื่องของรายวิชา (ตาราง 3.25)

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `clo_course_cycle_id` | Bigint | PK, AI | |
| `subject_id` | Varchar(20) | FK → `subjects`, U(1) | |
| `program_id` | Varchar(10) | FK → `programs`, U(1) | |
| `academic_year` | Varchar(4) | U(1) | ปีการศึกษา |
| `created_at` | Timestamp | | |

### 5.7 `clo_course_cycle_detail_cloplan` — รายละเอียดการปรับปรุงต่อเนื่อง (ตาราง 3.26)

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `clo_course_cycle_detail_id` | Bigint | PK, Generated Always | |
| `clo_course_cycle_id` | Bigint | FK → `clo_course_cycle_cloplan`, U(1) | |
| `clo_id` | Integer | FK → `subject_clo`, U(1) | |
| `detail_type` | Varchar(30) | CHECK, U(1) | `SUMMARY` (สรุปผล), `REFLECTION` (การสะท้อนคิด), `IMPROVEMENT` (การปรับปรุงจากรอบก่อนหน้า), `NEXT_PLAN` (แนวทางพัฒนาครั้งถัดไป) |
| `detail_text` | Text | NN | เนื้อหา |
| `reference_academic_year` | Integer | | ปีการศึกษาอ้างอิง |
| `created_at` | Timestamp | | |

---

## 6. กลุ่มกิจกรรมและคะแนน

### 6.1 `subject_score_ratio` — สัดส่วนคะแนนของรายวิชา (ตาราง 3.27)

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `score_ratio_id` | Integer | PK, AI | |
| `sequence_order` | Integer | NN | ลำดับที่ |
| `score_category` | Text | NN | ชื่อสัดส่วน เช่น `Quiz`, `Midterm`, `Final`, `โครงงาน` |
| `weight` | Smallint | default `0` | น้ำหนักคะแนน (%) — ผลรวมต้องเท่ากับ 100 (BR-05) |
| `section_id` | Integer | FK → `course_sections` | |
| `created_at` / `updated_at` | Timestamp | | |

### 6.2 `activities` — กิจกรรมการเรียนรู้ (ตาราง 3.28)

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `id` | Integer | PK, AI | |
| `score_ratio_id` | Integer | FK → `subject_score_ratio` | หมวดสัดส่วนคะแนนที่สังกัด |
| `activity_type` | Varchar(20) | CHECK, NN | `group` / `individual` (R067) |
| `activity_name` | Varchar(255) | NN | ชื่อกิจกรรม |
| `description` | Text | | คำอธิบาย |
| `score_number` | Numeric(5,2) | default `0` | คะแนนเต็มของกิจกรรม |
| `announcement_date` | Timestamp | | วันที่ประกาศ |
| `deadline_date` | Timestamp | | วันที่กำหนดส่ง |
| `course_syllabus_id` | Integer | FK → `course_syllabus` | สัปดาห์/หัวข้อในแผนการสอนที่เกี่ยวข้อง |
| `is_average_score` | Boolean | default `false` | คิดคะแนนแบบเฉลี่ยหรือไม่ |
| `is_self_assessment` | Boolean | default `false` | เป็นการประเมินตนเองหรือไม่ |
| `detail` | JSONB | | รายละเอียดเพิ่มเติมแบบยืดหยุ่น |
| `section_id` | Integer | FK → `course_sections` | |
| `expected_level` | Integer | | ระดับการบรรลุผลที่คาดหวัง |
| `created_at` / `updated_at` | Timestamp | | |

### 6.3 `activity_clo_mapping` — การเชื่อมโยงกิจกรรมกับ CLO (ตาราง 3.29)

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `id` | Integer | PK, AI | |
| `activity_id` | Integer | FK → `activities`, NN | |
| `sequence_order` | Integer | U(1), NN | ลำดับที่ในกิจกรรม |
| `weight` | Integer | default `0` | น้ำหนัก (%) ของ CLO ในกิจกรรมนี้ (BR-11) |
| `clo_id` | Integer | FK → `subject_clo` | |
| `score_ratio_id` | Integer | FK → `subject_score_ratio`, NN | |
| `score` | Numeric(5,2) | default `0` | คะแนนเต็มส่วนนี้ |
| `detail` | Text | | รายละเอียดสิ่งที่ต้องวัด |
| `created_at` / `updated_at` | Timestamp | | |

### 6.4 `activity_scores` — คะแนนกิจกรรมของนักศึกษา (ตาราง 3.30)

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `score_id` | Integer | PK, AI | |
| `student_id` | Varchar(20) | FK → `student`, U(1) | |
| `activity_id` | Integer | FK → `activities`, U(1) | |
| `clo_id` | Integer | FK → `subject_clo` | CLO ที่คะแนนนี้ถูกแยกไปให้ (R072) |
| `score` | Numeric(5,2) | | คะแนนที่ได้ |
| `created_at` / `updated_at` | Timestamp | | |

> การบันทึกใช้ `INSERT … ON CONFLICT DO UPDATE` (upsert) ตาม Sequence Diagram รูป 3.85

### 6.5 `activity_evidence` — หลักฐานการประเมิน (ตาราง 3.31)

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `evidence_id` | Integer | PK, Generated Always | |
| `section_id` | Integer | FK → `course_sections`, NN | |
| `activity_id` | Integer | FK → `activities`, NN | |
| `evidence_type` | Varchar(50) | | เช่น `assignment`, `project_file` — บน UI คือ โจทย์ / ตัวอย่างผลงานระดับดีเยี่ยม / ดี / ปานกลาง / ต้องปรับปรุง (R073, BR-16) |
| `description` | Text | | คำอธิบาย |
| `file_name` | Text | NN | ชื่อไฟล์ |
| `file_path` | Text | NN | ตำแหน่งจัดเก็บ |
| `mime_type` | Text | | ชนิดไฟล์ (รองรับ PDF — BR-15) |
| `file_size` | Integer | | ขนาดไฟล์ |
| `uploaded_by` | Varchar(8) | FK → `users` | |
| `uploaded_at` | Timestamp | | |
| `updated_by` | Varchar(8) | FK → `users` | |
| `updated_at` | Timestamp | | |
| `is_deleted` | Boolean | default `false` | soft delete |

---

## 7. กลุ่ม Rubric

### 7.1 `rubrics` — Rubric กลาง (ตาราง 3.32)

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `id` | Integer | PK, AI | |
| `rubric_code` | Varchar(20) | Unique, NN | เช่น `RUB001` |
| `rubric_name_en` | Varchar(255) | NN | ชื่อ Rubric (อังกฤษ) |
| `rubric_name_th` | Varchar(255) | NN | ชื่อ Rubric (ไทย) |
| `program_id` | Varchar(10) | FK → `programs` | หลักสูตรที่ Rubric สังกัด |
| `display_order` | Integer | default `0` | ลำดับการแสดงผล |
| `created_by` / `updated_by` | Varchar(8) | FK → `users` | |

### 7.2 `rubric_detail` — รายละเอียดเกณฑ์ Rubric (ตาราง 3.33)

> ชื่อในเล่มเป็นเอกพจน์ แต่โค้ดเดิมใช้ `rubric_details` ทั้งเก้าที่ และ rebuild ใช้พหูพจน์ — ดูหัวข้อ [10.3](#103-0003_assessment_scores_and_rubricssql)

| Field | Type | Key / Constraint | คำอธิบาย |
|---|---|---|---|
| `id` | Integer | PK, AI | |
| `rubric_id` | Integer | FK → `rubrics`, NN | |
| `criteria_name_en` | Varchar(255) | NN | ชื่อเกณฑ์ย่อย (อังกฤษ) |
| `criteria_name_th` | Varchar(255) | NN | ชื่อเกณฑ์ย่อย (ไทย) |
| `weight` | Numeric(5,2) | default `1.00` | น้ำหนัก |
| `level_4_description` | Text | | คำอธิบายระดับ 4 — ดีเยี่ยม |
| `level_3_description` | Text | | คำอธิบายระดับ 3 — ดี |
| `level_2_description` | Text | | คำอธิบายระดับ 2 — ปานกลาง |
| `level_1_description` | Text | | คำอธิบายระดับ 1 — ต้องปรับปรุง |
| `display_order` | Integer | default `0` | |
| `created_by` / `updated_by` | Varchar(8) | FK → `users` | |

---

## 8. Enum Types ที่ใช้ในระบบ

| Enum | ค่า |
|---|---|
| `status_enum` (users) | `active`, `inactive` |
| `student_status_enum` | `active`, `inactive`, `graduated`, `suspended` |
| `subject_type_enum` | `required` (วิชาบังคับ), `elective` (วิชาเลือก) |
| `outcome_type` | `knowledge`, `skills`, `ethics`, `character` |
| `mapping_level` | `I`, `D`, `P`, `A`, `E` |
| `learning_activity` | `Quiz`, `exam`, `homework` (และงานที่มอบหมาย) |
| `cognitive_level` | `remember`, `understand`, `apply`, `analyze` (และ evaluate, create) |
| `activity_type` | `individual`, `group` |
| `achievement_level` (CHECK) | `ดีเยี่ยม`, `ดี`, `พอใช้`, `ต้องปรับปรุง` |
| `detail_type` (CHECK) | `SUMMARY`, `REFLECTION`, `IMPROVEMENT`, `NEXT_PLAN` |
| `action_type` (CHECK) | `CREATE_GROUP`, `DELETE_GROUP`, `ADD_STUDENT`, `REMOVE_STUDENT`, `MOVE_STUDENT` |
| `user_log.activity` | `LOGIN`, `LOGOUT`, `VIEW` |

---

## 9. หมายเหตุ / ข้อสังเกตจากการสกัดข้อมูล

1. **ตารางที่ปรากฏเฉพาะใน ERD รวม (รูป 3.78) แต่ไม่มีคำอธิบายฟิลด์ในตาราง 3.3–3.34** — ยังไม่ได้จัดทำรายละเอียดในเอกสารนี้ ควรตรวจสอบกับฐานข้อมูลจริงก่อนใช้งาน:
   `announcements`, `attachments`, `activity_attachments`, `announcement_attachments`, `course_material`, `course_section_schedule`,
   `learning_activities`, `learning_activity_clo_mapping`, `learning_activity_attachments`,
   `rubric_details`, `rubric_levels`, `rubric_activity_mapping`,
   `student_activity`, `student_activity_group`, `student_activity_group_member`, `student_activity_rubric_score`,
   `student_learning_activity`, `student_learning_activity_group`, `student_learning_activity_group_member`
2. **ความไม่สอดคล้องของชนิดข้อมูลระหว่างตาราง** (พบในเอกสารต้นฉบับ — เป็นประเด็นที่ควร verify กับ DB จริง):
   - `users.department_id` เป็น `Char(2)` แต่ `subjects.department_id` เป็น `Varchar(20)` ขณะที่ `departments.department_id` เป็น `Varchar(2)`
   - `semester_courses.subject_id` เป็น `Varchar(8)` แต่ `subjects.subject_id` เป็น `Varchar(20)`
   - `activity_scores.student_id` เป็น `Varchar(20)` แต่ `student.student_id` เป็น `Varchar(8)`
   - `subject_clo_measurable_behavior.clo_id` / `subject_clo_achievement_criteria.clo_id` เป็น `Smallint` แต่ `subject_clo.clo_id` เป็น `Integer`
   - `program_subjects.created_by` เป็น `Varchar(20)` แต่ `users.user_id` เป็น `Varchar(8)`
3. **`rubric_detail` vs `rubric_details`** — เอกสารตาราง 3.33 ใช้ชื่อ `rubric_detail` ขณะที่ ERD รูป 3.78 มี `rubric_details` และ `rubric_levels` แยกกัน อาจเป็นการ refactor ระหว่างพัฒนา
4. **`course_sections.section_number` เป็น Unique เดี่ยว** — ตามหลักการควรเป็น Unique ร่วมกับ `semester_course_id` มิฉะนั้นจะเปิด "กลุ่ม 1" ได้เพียงรายวิชาเดียวทั้งระบบ (ประเด็นที่ต้องยืนยันกับผู้พัฒนา)
5. **`subject_clo.clo_number` เป็น Unique เดี่ยว** — ตามหลักการควรเป็น Unique ร่วมกับ `section_id` มิฉะนั้นแต่ละกลุ่มเรียนจะตั้งชื่อ `CLO1` ซ้ำกันไม่ได้
6. **`learning_outcomes.outcome_code` เป็น Unique เดี่ยว** — ควรเป็น Unique ร่วมกับ `program_id` เพื่อให้แต่ละหลักสูตรมี `PLO1` ของตนเองได้

---

## 10. การเบี่ยงเบนของ rebuild — ที่ migration จริงไม่ตรงกับเอกสารนี้

เอกสารนี้ **บรรยายสิ่งที่ส่งมอบ ไม่ได้กำหนดสิ่งที่จะสร้าง** ชนิดข้อมูลของ rebuild ถูกกู้จาก SQL ที่
model เดิม *ส่งจริง* ไม่ใช่จากตารางในเล่ม ซึ่งขัดกันหลายจุด เมื่อขัดกัน **โค้ดชนะ**

ตารางด้านล่างแยกตาม migration ตั๋วถัดไปให้ยึดตามนี้ ไม่ใช่ตามตารางในหัวข้อ 1–8

### 10.1 [`0001_identity_and_organisation.sql`](../db/migrations/0001_identity_and_organisation.sql)

| จุด | เอกสารนี้ว่า | migration 0001 ทำ | เหตุผล |
|---|---|---|---|
| `student.student_id` | PK, FK → `users` (§3.1) | PK อย่างเดียว **ไม่มี FK** | `createStudent` / `insertStudent` ไม่เขียนแถวใน `users` เลย และ query อ่านทั้งสามที่ `LEFT JOIN users` — FK จริงจะพังตั้งแต่แถวแรกที่ import |
| `student.admission_year` | Generated (§3.1) | คอลัมน์ธรรมดา | insert ทั้งสองทางส่งค่ามาเอง และการ insert ลง generated column เป็น error (`full_name_th` ยังคง generated เพราะมีแต่การอ่าน) |
| `student.full_name_th` | `Varchar(200)` (§3.1) | `text` | `first_name_th` + ` ` + `last_name_th` ที่ `Varchar(100)` สองตัวยาวได้ถึง 201 — ความกว้างในเล่มจะปฏิเสธชื่อคู่ที่ถูกต้อง |
| `user_log.activity` | LOGIN / LOGOUT / VIEW (§1.4) | `varchar` ไม่ใช่ enum | ผู้เรียก `addUserLog` เขียนเจ็ดค่า และไม่มี `VIEW` อยู่ในนั้น: `LOGIN`, `LOGOUT`, `GOOGLE_LOGIN`, `UPDATE_PROFILE`, `CHANGE_PASSWORD` และสถานะบัญชีตัวพิมพ์ใหญ่ `ACTIVE` / `INACTIVE` — เซตนี้เปิดและโตตามการกระทำที่ต้อง audit |
| `roles.role_name` | `Varchar(20)` (§1.2) | `varchar(100)` | เป็น label สำหรับแสดงผล ไม่ใช่โค้ด และ `Varchar(20)` ไม่พอสำหรับชื่อภาษาไทย |
| `users.faculty_id` | มีคอลัมน์ (§1.1) | **ไม่สร้าง** | ผู้ใช้เพียงรายเดียวคือ `getFacultyByEmail` ซึ่งไม่มีใครเรียก — คณะเข้าถึงได้ทาง `users.department_id → departments.faculty_id` |
| `program_subjects.id` | surrogate PK (§4.2) | **ตัดทิ้ง** PK เป็น `(program_id, subject_id)` | [ADR-0001](./adr/0001-three-tier-key-strategy.md) ชั้น 2 และยืนยันจากการใช้งาน — ทุก read / update / delete / reactivate ใน `program_subjectsModel` key ที่คู่นี้ ไม่มีที่ไหน select หรือ join บน `id` |
| `user_role` (§1.3) | ชื่อเอกพจน์ | `user_roles` | โค้ดใช้พหูพจน์ (ดูหมายเหตุท้ายหัวข้อ 9) PK คือ `(user_id, role_id, scope_id)` |
| `user_roles.scope_id` | — | `NOT NULL` และรับ sentinel `'FULL_ADMIN'` ได้ **ไม่มี FK** | ฝั่งอ่านเทียบ `scope_id` ที่อ่านกลับมาจาก DB กับ literal `'FULL_ADMIN'` อยู่แล้ว ส่วนฝั่งเขียนใน `userService` ยังส่ง null ได้ — จุดนี้จึง *ตัดสินใหม่* ไม่ใช่กู้มา และ seed ของตั๋ว #6 ต้องเขียน `'FULL_ADMIN'` ไม่ใช่ null · ไม่มี FK เพราะ `findScopeHierarchy` ไล่หาใน `programs` แล้ว `departments` แล้ว `faculty` — เป็น polymorphic |
| ความกว้างที่ขัดกันเอง (หัวข้อ 9 ข้อ 2) | `Char(2)` / `Varchar(2)` / `Varchar(8)` / `Varchar(20)` ปนกัน | **โค้ดคณะ ภาควิชา หลักสูตร = `varchar(10)`** · **รหัสบุคคล (`user_id`, `student_id`, ทุก `created_by` / `updated_by` / `assigned_by`) = `varchar(20)`** · **รหัสรายวิชา (`subject_id` และทุกคอลัมน์ที่ชี้มาที่มัน) = `varchar(8)`** | หนึ่งแนวคิดหนึ่งชนิด ตามเกณฑ์รับของตั๋ว #3 ข้อ 4 — `scope_id` ใช้ความกว้างของรหัสบุคคลเพราะต้องเก็บ sentinel ที่รูปร่างเหมือนชื่อ role ด้วย · รหัสรายวิชาเป็นกฎข้อที่สาม ไม่ใช่โค้ดองค์กรและไม่ใช่รหัสบุคคล: §4.3 ให้ `semester_courses.subject_id` เป็น `Varchar(8)` ขณะที่ §2.2 ให้ `subjects.subject_id` เป็น `Varchar(20)` — **รูปแบบจริงคือแปดหลักตายตัว** (`01076105`) จึงยึด `varchar(8)` ตาม §4.3 และเป็นความกว้างเดียวในไฟล์ที่ *ไม่* เผื่อโต โดยตั้งใจ เพราะการเปลี่ยนรูปแบบรหัสวิชาต้องเปลี่ยนทั้งมหาวิทยาลัยพร้อมกัน ไม่ใช่เรื่องที่คณะใดขยับเองได้ · **ตั๋ว #4 ต้องใช้ `varchar(8)` ให้ตรงกัน** เพราะ FK varchar↔varchar ที่ความกว้างต่างกันสร้างได้โดยไม่ error จะไม่มีอะไรมาเตือน |
| timestamp ทั้งหมด | `Timestamp` | `timestamptz` | โค้ดเดิมปนกันเอง — `upsertSubject` เขียน `CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok'` ขณะที่ `updateSubject` เขียน `NOW()` ซึ่งทำให้คอลัมน์เดียวมีสองความหมาย |
| แถวที่อาจถูกอ้างถึง | — | ทุกตารางอ้างอิงมี `is_active` **หรือ status enum** (`users.status`, `student.status`) และ FK เป็น `ON DELETE RESTRICT` | แอปเดิม soft-delete อยู่แล้ว (`deleteDepartment`, `deleteProgram`, `deleteSubject`, `deleteUser`) และ `deleteProgramSubject` ใช้ SQLSTATE 23503 เป็นสัญญาณให้ตั้ง `is_active = false` · ข้อยกเว้นคือแถวที่ไม่มีความหมายเมื่อเจ้าของหายไป — grant และ log line `CASCADE` จาก `users` |

`user_image` (§1.5 ตารางที่เล่มไม่ได้บันทึกไว้) ไม่ถูกสร้างที่นี่ — ไม่อยู่ในรายการสิบตารางของตั๋ว #3
ช่องว่างนี้ถูกพบตอนสร้าง 0003 และตั๋ว [#46](https://github.com/khthana/Deep-QA/issues/46) รับไป สร้างใน 0004 (§10.4)

### 10.2 [`0002_offerings_and_learning_outcomes.sql`](../db/migrations/0002_offerings_and_learning_outcomes.sql)

ครอบคลุมหัวข้อ 4.3–4.6 และ 5.1–5.7 ทั้งหมด (11 ตาราง) [ADR-0003](./adr/0003-clo-belongs-to-program-subject-year.md) เป็นตัวกำหนดรูปร่างของไฟล์นี้

| จุด | เอกสารนี้ว่า | migration 0002 ทำ | เหตุผล |
|---|---|---|---|
| `subject_clo.section_id` · `subject_clo_measurable_behavior.section_id` · `subject_clo_achievement_criteria.section_id` (§5.3–5.5) | FK → `course_sections` | **ตัดทิ้งทั้งสามตาราง** แทนด้วย `(program_id, subject_id, academic_year)` บน `subject_clo` | [ADR-0003](./adr/0003-clo-belongs-to-program-subject-year.md) — ทุกกลุ่มเรียนของการเปิดสอนเดียวกันสอนไปที่ผลการเรียนรู้ชุดเดียวกัน โครงเดิมบังคับให้แต่ละกลุ่มถือสำเนาของตัวเอง · ตั๋ว #4 เกณฑ์รับข้อ 3 |
| `subject_clo.updated_by` | ไม่มีคอลัมน์ (§5.3) | **เพิ่ม** `varchar(20)` FK → `users` | ADR-0003 ทำให้ CLO ชุดเดียวถูกอาจารย์หลายคนแก้ได้ last write wins จึงต้องสืบได้ว่าใครเขียนล่าสุด |
| `course_sections.section_number` | Unique เดี่ยว (§4.4 · หัวข้อ 9 ข้อ 4) | `UNIQUE (semester_course_id, section_number)` | ของเดิมเปิด "กลุ่ม 1" ได้เพียงรายวิชาเดียวทั้งมหาวิทยาลัย |
| `learning_outcomes.outcome_code` | Unique เดี่ยว (§5.1 · หัวข้อ 9 ข้อ 6) | `UNIQUE (program_id, outcome_code)` | แต่ละหลักสูตรต้องมี `PLO1` ของตนเองได้ |
| `subject_clo.clo_number` | Unique เดี่ยว (§5.3 · หัวข้อ 9 ข้อ 5) | `UNIQUE (program_id, subject_id, academic_year, clo_number)` | หัวข้อ 9 ข้อ 5 เสนอให้ unique ร่วมกับ `section_id` แต่ ADR-0003 ตัด section ทิ้ง ขอบเขตจึงเป็นหลักสูตร-รายวิชา-ปี |
| `semester_courses` | ไม่มี unique ตามธรรมชาติ (§4.3) | `UNIQUE (program_id, subject_id, academic_year, semester)` | [ADR-0001](./adr/0001-three-tier-key-strategy.md) ชั้น 3 — ไม่งั้นเปิดรายวิชาเดียวกันซ้ำในภาคเดียวกันได้ และไม่มีอะไรบอกความต่าง |
| `semester_courses` · `subject_plo_mapping` · `subject_clo` · `clo_course_cycle_cloplan` | FK แยก → `programs` และ → `subjects` | **FK คู่** `(program_id, subject_id)` → `program_subjects` | ตาม `CONTEXT.md` การเปิดสอนคือ *รายวิชาในหลักสูตร* ที่เปิดในปี-ภาคหนึ่ง FK แยกสองตัวยอมให้เปิดรายวิชาที่หลักสูตรนั้นไม่ได้สอน |
| `subject_plo_mapping.mapping_id` | surrogate PK (§5.2) | **ตัดทิ้ง** PK เป็น `(program_id, subject_id, outcome_id)` | ADR-0001 ชั้น 2 |
| `subject_plo_mapping.outcome_id` | nullable (§5.2) | `NOT NULL` | แถว placeholder ที่ไม่ระบุ outcome เป็นโค้ดตาย — `createEmptyMapping` ไม่มีใครเรียก ทางที่ดูเหมือนเรียก (import รายวิชาของหลักสูตร) ใช้ `createPloMapping` กับ `outcome_id: null` ต่างหาก และการอ่านเดียวที่แยก "มี placeholder" ออกจาก "ไม่มีแถว" ได้คือ `checkMappingExists` ซึ่งมีไว้ตัดสินว่าจะเขียน placeholder หรือไม่ · รายวิชาที่ยังไม่เชื่อมโยง = ไม่มีแถว ส่วน `mapping_level` `'E'` บอกได้ว่า PLO *ข้อที่ระบุ* ไม่ได้ถูกรายวิชานี้รองรับ ซึ่งแคบกว่าที่แถว placeholder เคยบอกได้ แต่เป็นอย่างเดียวที่มีโค้ดอ่าน |
| `course_sections_teacher.id` (§4.5) | surrogate PK | **ตัดทิ้ง** PK เป็น `(section_id, user_id)` | ADR-0001 ชั้น 2 · R035 อาจารย์หลายคนต่อกลุ่มเรียน |
| `course_sections_teacher.semester_course_id` (§4.5) | FK NN | **ไม่สร้าง** | insert ทั้งสามที่เขียนค่านี้ แต่ไม่มี query ไหนอ่าน — `getTeacherCourse` เข้าถึงการเปิดสอนผ่าน `course_sections` สำเนาที่ไม่มีใครอ่านทำได้อย่างเดียวคือขัดกับ section ของตัวเอง |
| `subject_clo_measurable_behavior.clo_id` · `subject_clo_achievement_criteria.clo_id` | `Smallint` (§5.4–5.5 · หัวข้อ 9 ข้อ 2) | `integer` ให้ตรงกับ `subject_clo.clo_id` | `Smallint` ทำให้ตารางหยุดรับแถวที่ CLO ลำดับ 32,767 |
| `course_syllabus.section_id` (§4.6) · `subject_clo_achievement_criteria.achievement_level` (§5.5) | nullable | `NOT NULL` ทั้งคู่ | แผนการสอนที่ไม่สังกัดกลุ่มเรียน และเกณฑ์ที่ไม่ระบุระดับ ไม่มีความหมาย |
| ความกว้าง `Varchar(8)` / `Varchar(20)` ใน §4.5, §4.6, §5.2, §5.3, §5.6 | `course_sections_teacher.user_id` = `Varchar(8)` · `course_syllabus.created_by` = `Varchar(8)` · `subject_plo_mapping.created_by`/`updated_by` = `Varchar(8)` · `subject_clo.created_by` = `Varchar(8)` · `subject_plo_mapping.subject_id` = `Varchar(20)` · `clo_course_cycle_cloplan.subject_id` = `Varchar(20)` | ยึดกฎความกว้างของ 0001 ทั้งหมด — รหัสบุคคล `varchar(20)` รหัสรายวิชา `varchar(8)` | เอกสารผิดในทางเดียวกันทั้งเจ็ดคอลัมน์ และ PostgreSQL จะไม่เตือน: FK varchar↔varchar ที่ความกว้างต่างกันสร้างสำเร็จ แล้วไปพังทีหลังกับค่าที่พอดีด้านหนึ่งแต่ไม่พอดีอีกด้าน · มีเทสต์เดียวตรวจ FK ทุกเส้นในสคีมาว่าชนิดและความกว้างตรงกับปลายทาง |
| `learning_activity` (§8) | `Quiz`, `exam`, `homework` (และงานที่มอบหมาย) | `exam`, `exercise`, `homework`, `assigned_work` — **ยึดตาม R063** | สามแหล่งไม่ตรงกัน: R063 (บังคับ M) ให้สี่ — ข้อสอบ, แบบฝึกหัด, การบ้าน, งานที่มอบหมาย · หน้าจอเดิมมีสามเพราะรวม `แบบฝึกหัด/การบ้าน` เป็นตัวเลือกเดียว ซึ่งเป็น *ข้อความบนจอ* ของ frontend ที่กำลังจะถูกเขียนใหม่ ไม่ใช่หลักฐานระดับสคีมาแบบ INSERT ที่เหลือรอด · §8 ให้สี่ค่าแต่บรรยายว่าสาม · ยึด R063 เพราะเป็นข้อกำหนดที่การรื้อสร้างต้องทำให้ได้ (marked M) — ไม่ใช่เพราะเป็นรายการที่ยาวกว่า ในทางต้นทุนแล้วรายการที่ *สั้นกว่า* ปลอดภัยกว่า เพราะการ *เพิ่ม* ค่าภายหลังคือ `ALTER TYPE … ADD VALUE` ครั้งเดียว (ในไฟล์ migration ใหม่ เพราะ ADD VALUE ใช้ในทรานแซกชันเดียวกับที่รันไม่ได้) ส่วนการ *ลด* ต้องเขียนทุกแถวที่ใช้ค่านั้นใหม่ · ตัด `Quiz` เพราะมีแต่ §8 · ใช้ `assigned_work` ไม่ใช่ `assignment` เพราะ `CONTEXT.md` สงวนคำนั้นไว้ให้ Activity |
| `subject_clo.plo_id` · `subject_plo_mapping.outcome_id` · `learning_outcomes.parent_outcome_id` | FK เดี่ยว → `learning_outcomes` (§5.1–5.3) | **FK คู่** `(program_id, …)` → `learning_outcomes (program_id, outcome_id)` พร้อม `UNIQUE (program_id, outcome_id)` บน `learning_outcomes` | เหตุผลเดียวกับ FK คู่เข้า `program_subjects` และเป็นเหตุผลที่ ADR-0003 ให้ไว้เองว่าทำไม `program_id` ต้องอยู่บน `subject_clo` — FK เดี่ยวยอมให้ CLO หรือการเชื่อมโยงของหลักสูตรหนึ่งไปอ้าง PLO ของอีกหลักสูตร และยอมให้ต้นไม้ PLO ข้ามหลักสูตร · `plo_id` ยัง nullable ได้เพราะ MATCH SIMPLE ปล่อยผ่านเมื่อคอลัมน์ใดคอลัมน์หนึ่งเป็น NULL |
| `subject_clo_measurable_behavior` · `subject_clo_achievement_criteria` | ไม่มี unique (§5.4–5.5) | `UNIQUE (clo_id, behavior_no)` · `UNIQUE (clo_id, criteria_no)` | ADR-0001 ชั้น 3 · โค้ดเดิมต้องการอยู่แล้ว — ทางลบจัดหมายเลขที่เหลือใหม่ให้เป็น 1..N ไม่มีช่องว่าง และ `subjectCloAchController` ตอบ "Duplicate entry … criteria_no" จากฝั่งแอปอยู่ก่อน · ลูปจัดหมายเลขใหม่ไล่ `ORDER BY … ASC` และการลบปล่อยเลขที่ *ต่ำกว่า* ให้ว่างเสมอ จึงไม่ชนกัน |
| `clo_course_cycle_detail_cloplan.reference_academic_year` | `Integer` (§5.7) | `varchar(4)` | ปีการศึกษาเป็น `varchar(4)` ทุกที่ทั้งใน 0001 และไฟล์นี้ · ปีที่มีแต่การเปรียบเทียบและแสดงผลไม่ใช่ตัวเลข และหนึ่งแนวคิดที่เก็บสองชนิดคือข้อบกพร่องประเภทที่หัวข้อ 9 มีไว้รวบรวม |
| `cognitive_level` (§8) | `remember`, `understand`, `apply`, `analyze` … | ครบหกระดับ `remember`, `understand`, `apply`, `analyze`, `evaluate`, `create` | `CONTEXT.md` ระบุ "(remember … create)" — §8 ไล่ไปสี่ตัวแล้วทิ้งท้ายไว้ในวงเล็บ |
| `achievement_level` · `detail_type` | CHECK (§5.5, §5.7) | คง CHECK ไม่แปลงเป็น enum | สี่ระดับการบรรลุผลจะปรากฏอีกที่ `rubrics` และหลักฐานการประเมินในตั๋วถัดไป CHECK ขยายทีละตารางได้โดยไม่ต้อง `ALTER TYPE` ที่กระทบทุกที่ |
| `clo_course_cycle_cloplan` · `clo_course_cycle_detail_cloplan` | U(1) (§5.6–5.7) | `UNIQUE (subject_id, program_id, academic_year)` และ `UNIQUE (clo_course_cycle_id, clo_id, detail_type)` | ไม่ใช่ของประดับ — `createCycle` และ `upsertDetail` จบด้วย `ON CONFLICT` บนคอลัมน์ชุดนี้พอดี ถ้าไม่มี constraint ที่ครอบคลุมตรงกัน PostgreSQL ตอบ 42P10 |
| `course_syllabus.week_no` (§4.6) · `semester_courses.semester` (§4.3) | ไม่มี CHECK | `CHECK (week_no > 0)` · `CHECK (semester IN (1, 2, 3))` | สัปดาห์ที่ศูนย์และภาคที่สี่คือการพิมพ์ผิด ไม่ใช่ค่าที่มีอยู่จริง |
| การลบ | — | `ON DELETE CASCADE` เฉพาะ `course_syllabus`, `subject_clo_measurable_behavior`, `subject_clo_achievement_criteria`, `clo_course_cycle_detail_cloplan` ที่เหลือ RESTRICT · authorship `SET NULL` | ตามกฎเดียวกับ 0001 — แถวที่ไม่มีความหมายของตัวเองเมื่อแม่หายไปคือส่วนประกอบ ไม่ใช่ระเบียน ส่วน `parent_outcome_id` เป็น RESTRICT เพราะการลบข้อหลักต้องไม่พาข้อย่อยหายไปเงียบ ๆ |

`course_syllabus` เป็นตารางที่สองต่อจาก `user_log` ที่ ADR-0001 ชั้น 3 ขอ natural key แล้วไม่มีให้ — `(section_id, week_no)` ดูเข้าท่าแต่ผิด เพราะ `upsertCourseSyllabus` ตัดสิน insert/update จาก surrogate id เท่านั้น ไม่เคยดูสัปดาห์ หนึ่งสัปดาห์จึงมีได้หลายหัวข้อ ต่างจาก `subject_clo_measurable_behavior` และ `subject_clo_achievement_criteria` ในตารางข้างบน ที่โค้ดเดิมจัดหมายเลขให้ไม่ซ้ำอยู่แล้ว

### 10.3 [`0003_assessment_scores_and_rubrics.sql`](../db/migrations/0003_assessment_scores_and_rubrics.sql)

ครอบคลุมหัวข้อ 3.2–3.5, 6.1–6.5 และ 7.1–7.2 ทั้งหมด (11 ตาราง) ไฟล์นี้ถือ **สอง grain**: ตารางสัดส่วนคะแนนย้ายไปอยู่ระดับหลักสูตร-รายวิชา-ปีตาม [ADR-0003](./adr/0003-clo-belongs-to-program-subject-year.md) ส่วนกิจกรรม คะแนน และหลักฐาน อยู่ระดับกลุ่มเรียนตามเดิม

| จุด | เอกสารนี้ว่า | migration 0003 ทำ | เหตุผล |
|---|---|---|---|
| `subject_score_ratio.section_id` (§6.1) | FK → `course_sections` | **ตัดทิ้ง** แทนด้วย `(program_id, subject_id, academic_year)` + FK คู่ → `program_subjects` | [ADR-0003](./adr/0003-clo-belongs-to-program-subject-year.md) เหตุผลเดียวกับ CLO — `subjectScoreModel` บันทึกทั้งชุดโดย key ที่ `section_id` สองกลุ่มเรียนของการเปิดสอนเดียวกันจึงถูกวัดคนละฐาน และตัวเลขการบรรลุผลที่รวมข้ามกลุ่มก็รวมข้ามฐาน · **เป็นการเบี่ยงเบนจากโค้ดเดิมโดยตั้งใจ** ไม่ใช่การกู้ ตั๋วที่สร้าง save path เขียนใหม่ที่ grain นี้ |
| `activities.score_ratio_id` (§6.2) | FK → `subject_score_ratio` | คง FK เดี่ยว **และบังคับความสอดคล้องของ grain ไม่ได้** | นี่คือรอยต่อของสอง grain — กิจกรรมถือแต่ `section_id` ไม่มีคอลัมน์หลักสูตร-รายวิชา-ปีให้ใส่ใน FK คู่ กิจกรรมของกลุ่มเรียนหนึ่งจึงอ้างหมวดคะแนนของอีกรายวิชาได้ และมีแต่ service layer ที่จะรู้ · การ denormalise grain ลงมาที่ `activities` ปิดช่องนี้ได้แต่แลกกับสำเนาการเปิดสอนของทุกกิจกรรม จึงเลือกให้ service layer หา offering จาก section แทน · **มีเทสต์ยืนยันว่าช่องนี้เปิดอยู่จริง** ไม่ใช่ข้อสันนิษฐาน |
| `student_group_change_log.student_id` (§3.5) | FK → `student` | FK **`ON DELETE RESTRICT`** ไม่ใช่ `SET NULL` | นักศึกษาคนไหนคือข้อเท็จจริงที่ log กำลังบันทึก แถวที่ลืมไปแล้วไม่ได้บันทึกอะไร · ต่างจากสามคอลัมน์กลุ่มตรงที่ไม่มีอะไรลบนักศึกษาในทรานแซกชันที่เขียน log — นักศึกษาถูก soft-delete ตามกฎของ 0001 RESTRICT จึงไม่เคยขวางการลบที่แอปทำจริง · `performed_by` เป็นข้อยกเว้นเพราะเป็นผู้กระทำ ไม่ใช่ผู้ถูกบันทึก จึง `SET NULL` ตามกฎ authorship |
| `rubrics` (§7.1) | — | **ชั้น 3 ไม่ใช่ชั้น 2** — คง surrogate `id` และให้ `rubric_code` เป็น UNIQUE | [ADR-0001](./adr/0001-three-tier-key-strategy.md) เคยนับ `rubrics` อยู่ในรายการชั้น 2 ซึ่งเป็นชั้นของตารางเชื่อม แต่ rubric ไม่ใช่ตารางเชื่อม ไม่มีพ่อแม่สองฝั่งให้ประกอบเป็นคีย์ · และถูกอ้างด้วย surrogate ตลอด — `rubricsModel` ลบและแก้ `WHERE id = $1` ส่วน `rubric_details.rubric_id` ก็คือ `id` นั้น การตัดทิ้งจึงต้องเขียน query ที่ไฟล์นี้มีไว้รองรับใหม่ · **รายการในตัว ADR เองที่ผิด** และได้แก้แล้ว — `rubrics` ย้ายไปอยู่รายการชั้น 3 จึงไม่เป็นการเบี่ยงเบนอีกต่อไป |
| `activity_scores.clo_id` (§6.4) | nullable · U(1) มีแค่ `student_id` + `activity_id` | `NOT NULL` · `UNIQUE (student_id, activity_id, clo_id)` | `activityScoreModel` เขียนคะแนนด้วย `ON CONFLICT (student_id, activity_id, clo_id) DO UPDATE` ซึ่งต้องมี unique constraint ตรงชุดนี้พอดี ไม่งั้นตอบ 42P10 · และคอลัมน์ที่ nullable อยู่ใน unique constraint ไม่ unique จริง — คะแนนสองแถวที่ไม่ระบุ CLO จะ insert ได้ทั้งคู่ upsert เลิกเป็น upsert เงียบ ๆ แล้วการให้คะแนนซ้ำจะสะสมแถวแทนที่จะทับ · R072 กำหนดให้ทุกคะแนนผูก CLO อยู่แล้ว |
| `subject_score_ratio` (§6.1) | ไม่มี unique ตามธรรมชาติ | `UNIQUE (program_id, subject_id, academic_year, score_category)` | ตั๋ว #5 เกณฑ์รับข้อ 2 · `score_category` เป็น text อิสระ (`Midterm`, `โครงงาน`) สองค่าที่ต่างกันแค่ช่องว่างท้ายจึงเป็นคนละหมวดที่นี่ — การ normalise เป็นงานของ service layer ตอนรับเข้า ไม่ใช่สิ่งที่สคีมาคิดขึ้นเอง |
| `activity_clo_mapping.sequence_order` (§6.3) | U(1) | `UNIQUE (activity_id, sequence_order) DEFERRABLE INITIALLY DEFERRED` | `upsertActivityCloMapping` เปิดทรานแซกชันแล้ว UPDATE แถวที่เหลือทีละแถว การสลับลำดับสองเกณฑ์จึงผ่านสถานะที่ทั้งคู่ถือเลขเดียวกัน ถ้าตรวจทุก statement การสลับลำดับเป็นไปไม่ได้เลย ถ้าตรวจตอน commit มันคือกลางทางของการย้ายที่ถูกต้อง · INSERT เดี่ยวยังถูกปฏิเสธ เพราะทรานแซกชันโดยปริยายจบที่ท้าย statement |
| `student_group_change_log.old_group_id` · `new_group_id` (§3.5) | FK → `student_group` | **ไม่เป็น FK** (คง `integer`) | เอกสารให้ `group_id` เป็นค่าเปล่าแต่ให้อีกสองคอลัมน์เป็น FK ซึ่งทำพร้อมกันไม่ได้ — `deleteGroup` เขียนแถว `DELETE_GROUP` แล้วจึงลบกลุ่มในทรานแซกชันเดียว RESTRICT จะทำให้ลบไม่ได้ ส่วน SET NULL จะลบข้อเท็จจริงที่กำลังบันทึกทิ้ง · log คือบันทึกว่าเกิดอะไรขึ้น ไม่ใช่ตัวชี้ไปยังสิ่งที่ยังอยู่ |
| `student_group_change_log.group_id` · `old_group_id` · `new_group_id` (§3.5) | `Smallint` | `integer` ให้ตรงกับ `student_group.group_id` | ข้อบกพร่องเดียวกับ `subject_clo_measurable_behavior.clo_id` ใน 0002 · **เทสต์ตรวจความกว้าง FK มองไม่เห็นคอลัมน์ชุดนี้** เพราะไม่ได้เป็น FK จึงมีเทสต์แยกที่ JOIN log กับกลุ่มจริงเพื่อยืนยันว่าเทียบกันได้โดยไม่ต้อง cast |
| ความกว้าง `Varchar(8)` / `Varchar(50)` ใน §3.2, §3.4, §3.5, §6.5, §7.1, §7.2 | `student_course.student_id` · `student_group_member.student_id` · `student_group_change_log.student_id` · `activity_evidence.uploaded_by`/`updated_by` · `rubrics.created_by`/`updated_by` · `rubric_details.created_by`/`updated_by` = `Varchar(8)` · `student_group_change_log.performed_by` = `Varchar(50)` | ทั้งเก้าคอลัมน์เป็น `varchar(20)` ตามกฎรหัสบุคคลของ 0001 | เอกสารผิดในทางเดียวกันทั้งเก้า — ให้ความกว้างของรหัสรายวิชาแก่รหัสบุคคล · เป็นข้อผิดพลาดชนิดเดียวกับที่โดนเจ็ดคอลัมน์ใน 0002 และ PostgreSQL ไม่เตือน |
| `rubric_detail` (§7.2 · หัวข้อ 9 ข้อ 3) | ชื่อเอกพจน์ | `rubric_details` | โค้ดเดิมใช้พหูพจน์เก้าที่ เอกพจน์ศูนย์ที่ ตามหลักของตั๋ว #3 ที่ให้โค้ดชนะ — และตรงกับเกณฑ์รับของตั๋ว #5 |
| `rubrics.rubric_code` (§7.1) | Unique เดี่ยว | คง **Unique เดี่ยวทั้งสถาบัน** ไม่ scope ด้วย `program_id` | ตรงข้ามกับ `section_number` และ `clo_number` ใน 0002 โดยตั้งใจ — `findRubricByCode` ค้นด้วยรหัสอย่างเดียวไม่มีหลักสูตรในมือ รหัสที่ความหมายต่างกันตามหลักสูตรจะ resolve ไปที่แถวไหนก็ได้ · `program_id` บอกว่าใครเป็นเจ้าของ ไม่ได้บอกว่าอยู่ namespace ไหน |
| `student_group.section_id` (§3.3) | nullable | `NOT NULL` | เหตุผลเดียวกับ `course_syllabus.section_id` ใน 0002 — กลุ่มที่ไม่สังกัดกลุ่มเรียนไม่มีความหมาย |
| `activity_type` (§6.2) · `action_type` (§3.5) · `evidence_type` (§6.5) | CHECK / Varchar | คง CHECK ไม่แปลงเป็น enum (`evidence_type` ไม่มี CHECK) | 0002 ใช้ enum เฉพาะที่ §8 ตั้งชื่อ domain ไว้ ไฟล์นี้ไม่มีสักตัว · ต่างกันที่ SQLSTATE (23514 ไม่ใช่ 22P02) และการเพิ่มค่าทำด้วย ALTER TABLE ในไฟล์ถัดไปได้ ไม่ต้อง ALTER TYPE ซึ่ง runner ที่ห่อหนึ่งไฟล์หนึ่งทรานแซกชันทำยากกว่า · BR-15 (เฉพาะ PDF) และ BR-16 (ชนิดหลักฐาน) ตรวจตอนอัปโหลดที่เห็นตัวไฟล์จริง ไม่ใช่ CHECK บนสตริงที่ผู้อัปโหลดกำหนดเอง |
| BR-05 (ผลรวม 100) · BR-06 (≤10 คนต่อกลุ่ม) · BR-07 (หนึ่งกลุ่มต่อรายวิชา) · BR-11 (ผลรวมน้ำหนัก CLO) | — | **ไม่อยู่ในสคีมา** เหลือแค่ขอบเขตรายแถว `CHECK (weight BETWEEN 0 AND 100)` | ไม่มีข้อไหนที่แถวเดียวตรวจตัวเองได้ — สองข้อแรกเป็นผลรวมและการนับพี่น้อง ส่วน BR-07 ต้องไล่ผ่านสองตารางไปถึงการเปิดสอน · เป็นงานของ service layer ในตั๋วที่สร้างมัน |
| การลบ | — | `CASCADE` สี่คอลัมน์ — `student_group_member.group_id` และ `activity_clo_mapping`, `activity_scores`, `rubric_details` ที่ชี้ไปพ่อแม่ของตัวเอง · ที่เหลือ RESTRICT · authorship / uploader `SET NULL` · `activities.course_syllabus_id` `SET NULL` | กฎเดียวกับ 0001 · `student_group` เป็น RESTRICT แม้กลุ่มนอกกลุ่มเรียนจะไร้ความหมาย เพราะการลบกลุ่มเป็นการกระทำที่ต้องถูกบันทึก cascade จะลบกลุ่มโดยไม่ผ่านโค้ดที่เขียน log · น้ำหนัก CLO และคะแนนไม่มีความหมายเมื่อกิจกรรมหายไป จึงเข้าข้อยกเว้น ส่วนหลักฐานไม่เข้า — ดูแถวถัดไป |
| `activity_evidence.activity_id` (§6.5) | FK → `activities` | `ON DELETE RESTRICT` — **เบี่ยงเบนจากโค้ดเดิมโดยตั้งใจ** | หลักฐานคือสิ่งที่การประเมิน TABEE ถูกนำมาแสดง จึงเป็นแถวที่ "ถูกอ้างถึงภายหลัง" ตามตัวกฎ ไม่ใช่ข้อยกเว้นของกฎ · `deleteActivity` ยิง `DELETE FROM activities WHERE id = $1` เปล่า ๆ ไม่เก็บกวาดลูกก่อน จึงจะได้ 23503 เมื่อกิจกรรมมีไฟล์แนบ — การปฏิเสธการลบและขอให้เอาหลักฐานออกก่อนเป็นงานของ **[#32](https://github.com/khthana/Deep-QA/issues/32)** ซึ่งมีเกณฑ์รับข้อนี้อยู่ · รูปแบบเดียวกับ ADR-0003 ที่เบี่ยงจาก `subjectScoreModel` โดยตั้งใจ · `activity_evidence` ยังคง soft-delete (`is_deleted`) ในเส้นทางปกติ |

`student_group.group_name` ไม่มี unique constraint เพราะ default เป็นสตริงว่าง กลุ่มที่ยังไม่ได้ตั้งชื่อจะชนกันเองตั้งแต่วันแรก

PK ร่วมของ `student_course` (§3.2) และ `student_group_member` (§3.4) **ไม่ใช่การเบี่ยงเบน** — เอกสารให้ไว้เป็น PK ร่วมอยู่แล้ว และ migration ทำตาม ตรงกับ ADR-0001 ชั้น 2 พอดี และการใช้งานก็ยืนยันให้อีกชั้น: ทุก INSERT/DELETE/SELECT ใน `studentCourseModel` และ `studentGroupModel` key ที่คู่ตามธรรมชาติ ไม่มีที่ไหนอ้าง surrogate `id` ส่วนการซ้ำที่เคยกันด้วย `SELECT` ในโค้ดแอปตอนนี้คีย์กันให้

### 10.4 [`0004_user_profile_image.sql`](../db/migrations/0004_user_profile_image.sql)

ครอบคลุมตารางเดียวคือ `user_image` (§1.5) — ตั๋ว [#46](https://github.com/khthana/Deep-QA/issues/46)
เป็นตารางเดียวในไฟล์นี้ที่ **ไม่มีอะไรให้เบี่ยงเบน** เพราะเล่มไม่ได้ให้คอลัมน์ไว้เลย ทุกอย่างจึงกู้จาก SQL
ที่โค้ดเดิมส่งจริง ตามกฎของตั๋ว #3 อย่างเต็มรูปแบบ รายการที่อยู่ตรงนี้จึงเป็น *การตัดสิน* ไม่ใช่การเบี่ยงเบน

| จุด | ที่มา | migration 0004 ทำ | เหตุผล |
|---|---|---|---|
| คีย์ของตาราง | — | `user_id` เป็นทั้ง PK และ FK ไม่มี surrogate | `ON CONFLICT (user_id)` ของ `upsertUserImage` ต้องการ unique constraint บน `user_id` ตรง ๆ ไม่งั้น PostgreSQL ยิง 42P10 และไม่เขียนอะไรเลย · ไม่ตรงชั้นไหนของ [ADR-0001](./adr/0001-three-tier-key-strategy.md): ไม่ใช่ reference data, ไม่ใช่ junction (junction ระบุตัวด้วยพ่อแม่ *คู่หนึ่ง* ตารางนี้มีพ่อแม่ตัวเดียว) และคีย์ตามธรรมชาติเป็นคอลัมน์เดียว จึงไม่มีอะไรให้ surrogate + UNIQUE ซื้อ |
| `user_id` | — | `varchar(20)` | ความกว้างรหัสบุคคลของ 0001 (§10.1 แถวสุดท้าย) — FK varchar↔varchar ที่กว้างต่างกันสร้างได้เงียบ ๆ แล้วพังทีหลัง |
| การลบ | — | `ON DELETE CASCADE` | เป็น **ข้อยกเว้น** ของกฎ RESTRICT ใน §10.1 ไม่ใช่ตัวกฎ — รูปโปรไฟล์ไม่มีความหมายของตัวเองเมื่อเจ้าของหายไป และไม่ใช่แถวที่การประเมินจะถูกนำมาแสดง · โค้ดเดิมเห็นตรงกัน: `deleteUser` เก็บกวาด `course_sections_teacher` เองด้วยมือก่อนลบผู้ใช้ แต่ไม่เคยเอ่ยถึง `user_image` เลย และข้อความใน branch 23503 ของมันเองบอกให้ "เช็ค CASCADE" · ไฟล์บนดิสก์ไม่ถูกลบตาม (`deleteUser` ไม่ unlink) เป็นงานของหน้าจอโปรไฟล์ ฝากไว้กับ [#35](https://github.com/khthana/Deep-QA/issues/35) |
| `image_path` | — | `text` NN | เก็บ path ไม่ใช่ blob — `controllers/userController.js:406` เขียนไฟล์ลงดิสก์ก่อน · `text` ด้วยเหตุผลเดียวกับ `activity_evidence.file_path` ความยาวเป็นเรื่องของ filesystem |
| `created_at` / `updated_at` | ทุกตารางอื่นใน 0001–0003 มี | **ไม่มีทั้งคู่** | ทางเขียนเดียวคือ upsert ซึ่งเซ็ตแค่ `image_path` — timestamp จะถูกแค่ครั้งแรกและผิดตั้งแต่ครั้งที่สอง ซึ่งแย่กว่าไม่มี เพราะอ่านแล้วเหมือนมีคนดูแล · ทางอ่านทั้งสองทางไม่ได้ select มันอยู่แล้ว ถ้าวันหนึ่งต้องการ "แก้รูปล่าสุดเมื่อไหร่" ให้เพิ่มคอลัมน์พร้อม upsert ที่ดูแลมันในตั๋วเดียวกัน |
| index | — | **ไม่เพิ่ม** | `user_id` เป็นคอลัมน์ซ้ายสุดของ PK อยู่แล้ว ซึ่งเป็นข้อยกเว้นในกฎ index ของ 0001 |

---

**ไฟล์ที่เกี่ยวข้อง:** [`01-requirements.md`](./01-requirements.md) · [`03-er-diagram.md`](./03-er-diagram.md) · [`04-test-cases-v0.1.md`](./04-test-cases-v0.1.md) · [`05-screen-api-mapping.md`](./05-screen-api-mapping.md) · [`06-implementation-plan.md`](./06-implementation-plan.md) · [`07-ticket-breakdown.md`](./07-ticket-breakdown.md)

> **หมายเหตุสำคัญ:** ข้อสังเกตในหัวข้อ 9 ถูกตัดสินไปแล้วระหว่างการออกแบบ — ดู [ADR-0001](./adr/0001-three-tier-key-strategy.md) (กลยุทธ์คีย์ 3 ชั้น และการแก้ unique constraint ที่กว้างเกินไป) และ [ADR-0003](./adr/0003-clo-belongs-to-program-subject-year.md) (CLO ย้ายไปผูกกับหลักสูตร-รายวิชา-ปีการศึกษา) · ตารางที่ไม่มีโค้ดแตะจะไม่ถูกสร้าง · โค้ดใช้ `rubric_details` และ `user_roles` (พหูพจน์) และมีตาราง `user_image` ที่เล่มไม่ได้บันทึกไว้ ซึ่งกู้รูปร่างจากโค้ดแล้วและบันทึกไว้ที่ §1.5 · สร้างใน 0004 (§10.4)
