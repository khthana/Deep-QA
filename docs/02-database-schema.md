# DEEP-Core — Database Schema

> สกัดจากปริญญานิพนธ์ **CE68-25 DEEP-Core** §3.5 "การออกแบบฐานข้อมูล" (ตาราง 3.3–3.34, รูป 3.78–3.84)
> DBMS: **PostgreSQL** · Timezone ค่าเริ่มต้น: `Asia/Bangkok`
> ER Diagram อยู่ในไฟล์แยก → [`03-er-diagram.md`](./03-er-diagram.md)

## สารบัญตาราง

| กลุ่ม | ตาราง |
|---|---|
| ผู้ใช้งานและสิทธิ์ | `users`, `roles`, `user_role`, `user_log` |
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

**ไฟล์ที่เกี่ยวข้อง:** [`01-requirements.md`](./01-requirements.md) · [`03-er-diagram.md`](./03-er-diagram.md) · [`04-test-cases-v0.1.md`](./04-test-cases-v0.1.md) · [`05-screen-api-mapping.md`](./05-screen-api-mapping.md)
