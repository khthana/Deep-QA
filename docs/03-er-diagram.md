# DEEP-Core — ER Diagram

> แผนภาพความสัมพันธ์ของข้อมูล (Entity Relationship Diagram) ในรูปแบบ **Mermaid `erDiagram`**
> ซึ่งเป็นรูปแบบที่เหมาะสมกับเอกสาร Markdown เพราะ render ได้บน GitHub / VS Code / Artifact โดยตรง และ diff ได้เหมือนโค้ด
> อ้างอิงจาก §3.5 รูป 3.78–3.84 · รายละเอียดฟิลด์อยู่ใน [`02-database-schema.md`](./02-database-schema.md)

**Cardinality notation ที่ใช้**

| สัญลักษณ์ | ความหมาย |
|---|---|
| `||--o{` | one-to-many (ฝั่งลูกมีได้ 0..N) |
| `||--||` | one-to-one |
| `}o--||` | many-to-one (ฝั่งซ้ายมีได้ 0..N) |
| `||--o|` | one-to-zero-or-one |

---

## 1. ภาพรวมทั้งระบบ (Whole-system ERD — รูป 3.78)

```mermaid
erDiagram
    faculty        ||--o{ departments : "ประกอบด้วย"
    departments    ||--o{ programs : "เปิดสอน"
    departments    ||--o{ subjects : "เป็นเจ้าของ"
    departments    ||--o{ users : "สังกัด"
    programs       ||--o{ users : "สังกัด"

    users          ||--o{ user_role : "ได้รับสิทธิ์"
    roles          ||--o{ user_role : "ถูกอ้างอิงโดย"
    users          ||--o{ user_log : "บันทึกกิจกรรม"
    users          ||--o| student : "เป็นนักศึกษา"

    programs       ||--o{ student : "มีนักศึกษา"
    programs       ||--o{ program_subjects : "มีรายวิชา"
    subjects       ||--o{ program_subjects : "ถูกบรรจุใน"
    programs       ||--o{ semester_courses : "เปิดสอน"
    subjects       ||--o{ semester_courses : "ถูกเปิดสอน"
    semester_courses ||--o{ course_sections : "แบ่งเป็นกลุ่มเรียน"
    course_sections  ||--o{ course_sections_teacher : "มีผู้สอน"
    users            ||--o{ course_sections_teacher : "สอน"
    course_sections  ||--o{ course_syllabus : "มีแผนการสอน"

    course_sections ||--o{ student_course : "มีผู้ลงทะเบียน"
    student         ||--o{ student_course : "ลงทะเบียน"
    course_sections ||--o{ student_group : "มีกลุ่มงาน"
    student_group   ||--o{ student_group_member : "มีสมาชิก"
    student         ||--o{ student_group_member : "เป็นสมาชิก"
    student_group   ||--o{ student_group_change_log : "ถูกบันทึกประวัติ"

    programs           ||--o{ learning_outcomes : "กำหนด PLO"
    learning_outcomes  ||--o{ learning_outcomes : "เป็นข้อย่อยของ"
    learning_outcomes  ||--o{ subject_plo_mapping : "ถูกแมปกับรายวิชา"
    subjects           ||--o{ subject_plo_mapping : "แมปกับ PLO"

    course_sections   ||--o{ subject_clo : "กำหนด CLO"
    learning_outcomes ||--o{ subject_clo : "เชื่อมโยงกับ CLO"
    subject_clo ||--o{ subject_clo_measurable_behavior : "มีพฤติกรรมที่วัดได้"
    subject_clo ||--o{ subject_clo_achievement_criteria : "มีเกณฑ์การบรรลุผล"

    subjects ||--o{ clo_course_cycle_cloplan : "มีรอบปรับปรุง"
    programs ||--o{ clo_course_cycle_cloplan : "มีรอบปรับปรุง"
    clo_course_cycle_cloplan ||--o{ clo_course_cycle_detail_cloplan : "มีรายละเอียด"
    subject_clo              ||--o{ clo_course_cycle_detail_cloplan : "ถูกสรุปผล"

    course_sections     ||--o{ subject_score_ratio : "กำหนดสัดส่วนคะแนน"
    subject_score_ratio ||--o{ activities : "มีกิจกรรม"
    course_syllabus     ||--o{ activities : "อ้างอิงสัปดาห์"
    activities          ||--o{ activity_clo_mapping : "เชื่อมโยง CLO"
    subject_clo         ||--o{ activity_clo_mapping : "ถูกวัดโดยกิจกรรม"
    activities          ||--o{ activity_scores : "มีคะแนน"
    student             ||--o{ activity_scores : "ได้รับคะแนน"
    subject_clo         ||--o{ activity_scores : "แยกคะแนนตาม CLO"
    activities          ||--o{ activity_evidence : "มีหลักฐาน"
    course_sections     ||--o{ activity_evidence : "จัดเก็บหลักฐาน"

    programs ||--o{ rubrics : "มี Rubric กลาง"
    rubrics  ||--o{ rubric_detail : "มีเกณฑ์ย่อย"
```

---

## 2. โมดูลผู้ใช้งานและสิทธิ์ (รูป 3.79)

```mermaid
erDiagram
    users {
        varchar user_id PK
        varchar email UK "NN"
        varchar phone
        varchar title_th
        varchar first_name_th
        varchar last_name_th
        varchar title_en "NN"
        varchar first_name_en "NN"
        varchar last_name_en "NN"
        char    department_id FK
        varchar program_id FK
        enum    status "default active"
        bool    is_verified
        varchar verification_token
        varchar password "hashed min 8"
        timestamp created_at
        timestamp updated_at
    }
    roles {
        varchar role_id PK "STUDENT TEACHER FULL_ADMIN"
        varchar role_name "NN"
        int     priority "NN"
    }
    user_role {
        int     id PK "auto"
        varchar user_id FK "NN"
        varchar role_id FK
        varchar scope_id "ขอบเขตสิทธิ์"
        timestamptz assigned_at "default Asia Bangkok"
        varchar assigned_by FK "ผู้มอบสิทธิ์"
        bool    is_active "default true"
    }
    user_log {
        int     id PK "auto"
        varchar user_id FK "NN"
        varchar activity "NN LOGIN LOGOUT VIEW"
        timestamp time_stamp
    }

    users ||--o{ user_role : "มีได้หลายบทบาท"
    roles ||--o{ user_role : "ถูกมอบให้"
    users ||--o{ user_log  : "สร้าง log"
    users ||--o{ user_role : "เป็นผู้มอบสิทธิ์ assigned_by"
```

---

## 3. โมดูลโครงสร้างองค์กร (รูป 3.80)

```mermaid
erDiagram
    faculty {
        varchar faculty_id PK
        varchar faculty_name_en "NN"
        varchar faculty_name_th "NN"
        bool    is_active "default true"
    }
    departments {
        varchar department_id PK
        varchar department_name_en
        varchar department_name_th
        varchar faculty_id FK
        bool    is_active "default true"
    }
    programs {
        varchar program_id PK "NN"
        varchar program_name_en
        varchar program_name_th
        varchar department_id FK
        varchar year "ปีการศึกษา พ.ศ."
        bool    is_active "default true"
        timestamp created_at
        timestamp updated_at
    }

    faculty     ||--o{ departments : "มีภาควิชา"
    departments ||--o{ programs    : "มีหลักสูตร"
```

---

## 4. โมดูลนักศึกษา (รูป 3.81)

```mermaid
erDiagram
    student {
        varchar student_id PK "FK to users"
        varchar first_name_th "NN"
        varchar last_name_th "NN"
        varchar full_name_th "Generated"
        varchar department_id FK "NN"
        varchar program_id FK "NN"
        varchar admission_year "Generated 25xx"
        enum    status "active inactive graduated suspended"
        timestamp created_at
        timestamp updated_at
    }
    student_course {
        int     section_id PK "FK NN"
        varchar student_id PK "FK NN"
        timestamp created_at
        timestamp updated_at
    }
    student_group {
        int     group_id PK "auto"
        varchar group_name "default empty"
        int     section_id FK
        timestamp created_at
        timestamp updated_at
    }
    student_group_member {
        int     group_id PK "FK NN"
        varchar student_id PK "FK NN"
        timestamp created_at
    }
    student_group_change_log {
        int     log_id PK "auto"
        smallint group_id "NN"
        varchar group_name "NN"
        varchar student_id FK
        varchar action_type "CREATE DELETE ADD REMOVE MOVE"
        smallint old_group_id FK
        smallint new_group_id FK
        varchar performed_by FK
        int     section_id FK "NN"
        timestamp created_at
    }

    student       ||--o{ student_course : "ลงทะเบียนเรียน"
    student       ||--o{ student_group_member : "เป็นสมาชิกกลุ่ม max 1 กลุ่ม"
    student_group ||--o{ student_group_member : "มีสมาชิก max 10 คน"
    student_group ||--o{ student_group_change_log : "บันทึกการเปลี่ยนแปลง"
    student       ||--o{ student_group_change_log : "ถูกอ้างอิง"
```

---

## 5. โมดูลรายวิชาและการเปิดสอน (รูป 3.82)

```mermaid
erDiagram
    subjects {
        varchar subject_id PK "NN"
        varchar subject_name_en "NN"
        varchar subject_name_th "NN"
        int     credits "NN"
        text    description_th
        text    description_en
        varchar department_id FK
        bool    is_active "default true"
        varchar created_by FK
        varchar updated_by FK
        timestamp created_at
        timestamp updated_at
    }
    program_subjects {
        int     id PK "auto"
        varchar program_id FK "U1"
        varchar subject_id FK "U1"
        enum    subject_type "NN required elective"
        bool    is_active "default true"
        varchar created_by FK
        varchar updated_by FK
        timestamp created_at
        timestamp updated_at
    }
    semester_courses {
        int     id PK "auto"
        varchar academic_year "NN"
        smallint semester "NN 1 2 3"
        varchar subject_id FK "NN"
        varchar program_id FK "NN"
        timestamp created_at
        timestamp updated_at
    }
    course_sections {
        int     section_id PK "auto"
        int     semester_course_id FK "NN"
        varchar section_number UK "NN"
        timestamp created_at
        timestamp updated_at
    }
    course_sections_teacher {
        int     id PK "auto"
        int     section_id FK "NN"
        varchar user_id FK "NN"
        int     semester_course_id FK "NN"
        timestamp created_at
        timestamp updated_at
    }
    course_syllabus {
        int     id PK "Generated Always"
        int     section_id FK
        smallint week_no "NN"
        text    title
        text    description
        text    remark
        varchar created_by FK
        timestamp created_at
        timestamp updated_at
    }

    subjects         ||--o{ program_subjects : "ถูกบรรจุในหลักสูตร"
    subjects         ||--o{ semester_courses : "ถูกเปิดสอน"
    semester_courses ||--o{ course_sections : "แบ่งกลุ่มเรียน"
    course_sections  ||--o{ course_sections_teacher : "มีอาจารย์ผู้สอนหลายคน"
    course_sections  ||--o{ course_syllabus : "มีแผนการสอนรายสัปดาห์"
    course_sections  ||--o{ student_course : "มีผู้ลงทะเบียน"
```

---

## 6. โมดูลผลการเรียนรู้ PLO / CLO (รูป 3.83)

```mermaid
erDiagram
    learning_outcomes {
        int     outcome_id PK "auto"
        varchar program_id FK "NN"
        varchar outcome_code UK "NN เช่น PLO1"
        varchar outcome_title "NN"
        text    outcome_description
        enum    outcome_type "knowledge skills ethics character"
        int     parent_outcome_id FK "self ข้อย่อย"
        int     sequence_order "NN"
        smallint level_depth "default 1"
        bool    is_expanded "default false"
        bool    is_active "default true"
        varchar created_by FK
        varchar updated_by FK
        timestamp created_at
        timestamp updated_at
    }
    subject_plo_mapping {
        int     mapping_id PK "auto"
        varchar program_id "NN"
        varchar subject_id FK "U1"
        int     outcome_id FK "U1"
        enum    mapping_level "default E : I D P A E"
        varchar created_by FK
        varchar updated_by FK
        timestamp created_at
        timestamp updated_at
    }
    subject_clo {
        int     clo_id PK "auto"
        varchar clo_number UK "NN เช่น CLO1"
        text    clo_detail
        text    teaching_method
        text    assessment_method
        int     section_id FK "NN"
        int     plo_id FK
        varchar created_by FK
        timestamp created_at
        timestamp updated_at
    }
    subject_clo_measurable_behavior {
        int     id PK "auto"
        smallint clo_id FK "NN"
        smallint behavior_no "NN"
        enum    learning_activity "NN Quiz exam homework"
        text    behavior_detail "NN"
        enum    cognitive_level "NN remember understand apply analyze"
        int     section_id FK
        timestamp created_at
        timestamp updated_at
    }
    subject_clo_achievement_criteria {
        int     id PK "auto"
        smallint clo_id FK "NN"
        smallint criteria_no "NN"
        varchar achievement_level "CHECK 4 ระดับ"
        text    criteria_detail "NN"
        text    criteria_description
        int     section_id FK
        timestamp created_at
        timestamp updated_at
    }
    clo_course_cycle_cloplan {
        bigint  clo_course_cycle_id PK "auto"
        varchar subject_id FK "U1"
        varchar program_id FK "U1"
        varchar academic_year "U1"
        timestamp created_at
    }
    clo_course_cycle_detail_cloplan {
        bigint  clo_course_cycle_detail_id PK "Generated Always"
        bigint  clo_course_cycle_id FK "U1"
        int     clo_id FK "U1"
        varchar detail_type "U1 SUMMARY REFLECTION IMPROVEMENT NEXT_PLAN"
        text    detail_text "NN"
        int     reference_academic_year
        timestamp created_at
    }

    learning_outcomes ||--o{ learning_outcomes : "ข้อหลัก มี ข้อย่อย"
    learning_outcomes ||--o{ subject_plo_mapping : "แมปกับรายวิชา"
    learning_outcomes ||--o{ subject_clo : "CLO เชื่อมโยงกับ PLO"
    subject_clo ||--o{ subject_clo_measurable_behavior : "มีพฤติกรรมที่วัดได้"
    subject_clo ||--o{ subject_clo_achievement_criteria : "มีเกณฑ์ 4 ระดับ"
    clo_course_cycle_cloplan ||--o{ clo_course_cycle_detail_cloplan : "มีรายละเอียด 4 ประเภท"
    subject_clo ||--o{ clo_course_cycle_detail_cloplan : "ถูกสรุปผลรายรอบ"
```

---

## 7. โมดูลกิจกรรม คะแนน และ Rubric (รูป 3.84)

```mermaid
erDiagram
    subject_score_ratio {
        int     score_ratio_id PK "auto"
        int     sequence_order "NN"
        text    score_category "NN Quiz Midterm Final"
        smallint weight "default 0 รวมต้องเท่ากับ 100"
        int     section_id FK
        timestamp created_at
        timestamp updated_at
    }
    activities {
        int     id PK "auto"
        int     score_ratio_id FK
        varchar activity_type "NN CHECK group individual"
        varchar activity_name "NN"
        text    description
        numeric score_number "default 0"
        timestamp announcement_date
        timestamp deadline_date
        int     course_syllabus_id FK
        bool    is_average_score "default false"
        bool    is_self_assessment "default false"
        jsonb   detail
        int     section_id FK
        int     expected_level
        timestamp created_at
        timestamp updated_at
    }
    activity_clo_mapping {
        int     id PK "auto"
        int     activity_id FK "NN"
        int     sequence_order "U1 NN"
        int     weight "default 0 percent"
        int     clo_id FK
        int     score_ratio_id FK "NN"
        numeric score "default 0"
        text    detail
        timestamp created_at
        timestamp updated_at
    }
    activity_scores {
        int     score_id PK "auto"
        varchar student_id FK "U1"
        int     activity_id FK "U1"
        int     clo_id FK
        numeric score
        timestamp created_at
        timestamp updated_at
    }
    activity_evidence {
        int     evidence_id PK "Generated Always"
        int     section_id FK "NN"
        int     activity_id FK "NN"
        varchar evidence_type "assignment project_file"
        text    description
        text    file_name "NN"
        text    file_path "NN"
        text    mime_type "PDF only"
        int     file_size
        varchar uploaded_by FK
        timestamp uploaded_at
        varchar updated_by FK
        timestamp updated_at
        bool    is_deleted "default false"
    }
    rubrics {
        int     id PK "auto"
        varchar rubric_code UK "NN RUB001"
        varchar rubric_name_en "NN"
        varchar rubric_name_th "NN"
        varchar program_id FK
        int     display_order "default 0"
        varchar created_by FK
        varchar updated_by FK
    }
    rubric_detail {
        int     id PK "auto"
        int     rubric_id FK "NN"
        varchar criteria_name_en "NN"
        varchar criteria_name_th "NN"
        numeric weight "default 1.00"
        text    level_4_description "ดีเยี่ยม"
        text    level_3_description "ดี"
        text    level_2_description "ปานกลาง"
        text    level_1_description "ต้องปรับปรุง"
        int     display_order "default 0"
        varchar created_by FK
        varchar updated_by FK
    }

    subject_score_ratio ||--o{ activities : "จัดหมวดหมู่กิจกรรม"
    activities          ||--o{ activity_clo_mapping : "เชื่อมโยง 1 CLO ต่อ row"
    activities          ||--o{ activity_scores : "มีคะแนนนักศึกษา"
    activities          ||--o{ activity_evidence : "แนบหลักฐาน 5 ประเภท"
    subject_score_ratio ||--o{ activity_clo_mapping : "อ้างอิงสัดส่วน"
    rubrics             ||--o{ rubric_detail : "มีเกณฑ์ย่อย 4 ระดับ"
```

---

## 8. สรุปความสัมพันธ์หลักเชิงธุรกิจ

```
faculty (1) ─── (N) departments (1) ─── (N) programs
                                              │
                          ┌───────────────────┼─────────────────────┐
                          │                   │                     │
                   learning_outcomes    program_subjects        student
                    (PLO tree)                │                     │
                          │                   │                     │
                   subject_plo_mapping ── subjects                  │
                          │                   │                     │
                          │            semester_courses             │
                          │                   │                     │
                          │            course_sections ──── student_course
                          │                   │                     │
                          └──────────── subject_clo           student_group
                                              │                     │
                                    ┌─────────┴─────────┐   student_group_member
                                    │                   │
                    measurable_behavior     achievement_criteria
                                              │
                                subject_score_ratio ─── activities
                                                            │
                                       ┌────────────────────┼──────────────────┐
                              activity_clo_mapping   activity_scores   activity_evidence
```

**เส้นทางการคำนวณผลการบรรลุผล (Data Flow):**

```
activity_scores (คะแนนดิบ)
   └─▶ activity_clo_mapping (weight %)   ─▶ คะแนน CLO รายบุคคล (สเกล 5)
          └─▶ subject_clo_achievement_criteria (4 ระดับ)  ─▶ ผ่าน/ไม่ผ่าน (เกณฑ์ > 60%)
                 └─▶ subject_clo.plo_id ─▶ learning_outcomes ─▶ คะแนน PLO ระดับหลักสูตร
                        └─▶ แสดงผล: Radar Chart / Heatmap / Sankey Diagram / รายงาน PDF
```

---

## 9. หมายเหตุ

- ERD นี้ครอบคลุมเฉพาะ **32 ตารางที่มีคำอธิบายฟิลด์ในตาราง 3.3–3.34** ของปริญญานิพนธ์
  ตารางที่ปรากฏเฉพาะใน ERD รวม (รูป 3.78) โดยไม่มีรายละเอียดฟิลด์ ถูกระบุไว้ในหัวข้อ 9 ของ [`02-database-schema.md`](./02-database-schema.md)
- ชนิดข้อมูลใน Mermaid block ถูกย่อ (เช่น `varchar` แทน `Varchar(100)`) เนื่องจากข้อจำกัดของไวยากรณ์ Mermaid — ความยาวจริงดูได้ที่ไฟล์ schema
- ข้อสังเกตเรื่อง Unique constraint ที่อาจกว้างเกินไป (`section_number`, `clo_number`, `outcome_code`) ระบุไว้ในหัวข้อ 9 ของไฟล์ schema เช่นกัน

---

**ไฟล์ที่เกี่ยวข้อง:** [`01-requirements.md`](./01-requirements.md) · [`02-database-schema.md`](./02-database-schema.md) · [`04-test-cases-v0.1.md`](./04-test-cases-v0.1.md) · [`05-screen-api-mapping.md`](./05-screen-api-mapping.md)
