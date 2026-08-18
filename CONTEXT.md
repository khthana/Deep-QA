# DEEP-Core

A curriculum and learning-outcomes management system for KMITL's Faculty of Engineering. It records what a programme
intends its graduates to learn, how each subject teaches and assesses that, and how far each student actually got —
as evidence for TABEE accreditation.

## Language

### Curriculum structure

**Faculty** (คณะ):
The top of the organisational tree. Owns Departments.

**Department** (ภาควิชา):
An academic department within a Faculty. Owns Programs and Subjects.
_Avoid_: division

**Program** (หลักสูตร):
A degree curriculum owned by a Department, identified by a code such as `0501`. Owns PLOs and Rubrics.
_Avoid_: curriculum, course

**Subject** (รายวิชา):
A catalogue entry — a teachable unit with a code such as `01076105`, a credit count and a description. Exists
independently of any programme or year.
_Avoid_: course

**Program Subject** (รายวิชาในหลักสูตร):
A Subject placed into a Program, carrying whether it is required (บังคับ) or elective (เลือก). The pairing that CLOs
and PLO mappings hang off.

**Offering** (การเปิดสอน):
A Program Subject opened for a specific academic year and semester. One Offering splits into Sections.
_Avoid_: semester course, course in term

**Section** (กลุ่มเรียน):
A teaching group within an Offering, with its own teachers, enrolled students, activities and scores.
_Avoid_: class, course

### Learning outcomes

**PLO** (ผลการเรียนรู้ระดับหลักสูตร):
A Program Learning Outcome — what a graduate of a Program should be able to do. Forms a tree of main and sub-outcomes,
typed as knowledge, skills, ethics or character.

**CLO** (ผลการเรียนรู้ระดับรายวิชา):
A Course Learning Outcome — what a Subject teaches towards. Belongs to a (Program, Subject, academic year), so all
Sections of one Offering share a CLO set and each year's set is frozen once scores exist. See
[ADR-0003](./docs/adr/0003-clo-belongs-to-program-subject-year.md).

**Mapping Level** (ระดับการเชื่อมโยง):
How strongly a Subject serves a PLO, on a five-point scale: `I` Introduced, `D` Developed, `P` Practiced,
`A` Assessed, `E` Empty.

**Measurable Behavior** (พฤติกรรมบ่งชี้):
An observable behaviour that evidences a CLO, tagged with a cognitive level (remember … create).

**Achievement Criteria** (เกณฑ์การบรรลุผล):
The four-band rubric for a CLO: ดีเยี่ยม / ดี / พอใช้ / ต้องปรับปรุง.

**Program-level Result** (ผลการเรียนรู้ระดับหลักสูตร):
PLO attainment rolled up from CLO scores across a cohort. Distinct from a course-level result, which is CLO attainment
within one Section.
_Avoid_: course level — the inherited `courseLevel*` screen names mean this and are renamed `programLevel*`

### Assessment

**Score Ratio** (สัดส่วนคะแนน):
A named weighting category such as Quiz, Midterm or โครงงาน. Weights must total 100.

**Activity** (กิจกรรมการเรียนรู้):
A piece of assessed work within a Section, either individual or group, carrying a full mark and linked to CLOs with
per-CLO weights.
_Avoid_: assignment, task

**Work Group** (กลุ่มงาน):
A group of at most 10 students within a Section for group Activities. A student belongs to at most one Work Group per
Section.
_Avoid_: team, student group

**Evidence** (หลักฐานการประเมิน):
A PDF attached to an Activity — the brief itself, or a sample of work at each of the four achievement bands.

**Rubric** (Rubric กลาง):
A reusable scoring guide owned by a Program, with weighted criteria described at four levels.

### Roles

**Central Admin** (ผู้ดูแลระบบกลาง, `FULL_ADMIN`):
Manages user accounts and permission grants system-wide, and nothing else. Deliberately has no access to curriculum
data — see [ADR-0002](./docs/adr/0002-server-side-rbac.md).

**Faculty Admin** (ผู้ดูแลระดับคณะ, `FACULTY_ADMIN`):
Owns master data and outcomes within one Faculty. The only role that may manage Departments.

**Department Admin** (ผู้ดูแลระดับภาควิชา, `DEPT_ADMIN`):
As Faculty Admin, but confined to one Department and excluding Department records themselves.

**Curriculum Committee** (กรรมการหลักสูตร, `PROG_MANAGER`):
Owns one Program: its PLOs, its Program Subjects, its Offerings, and its Program-level Results. The only role that may
create Offerings.

**Teacher** (อาจารย์ผู้สอน, `TEACHER`):
Owns the Sections they teach: students, Work Groups, CLOs, Activities, scores and Evidence.

**External Assessor** (ผู้ประเมินภายนอก, `EXT_ASSESSOR`):
A time-boxed account for accreditation review.

**Acting grant** (บทบาทที่กำลังใช้งาน):
The single grant a signed-in account is working as right now, out of however many it holds. One person may be a
department administrator and also teach; the two reach different records, so "what may this person do" has no answer
until one of the hats is on. On sign-in the acting grant is the most senior held — lowest `priority` — and the person
may change it to any other grant they hold.

Every authorisation decision reads the acting grant and none reads the full set: holding a grant is not exercising it,
so a teacher acting as a teacher is refused what their administrator grant would have allowed. The selection travels
in the session cookie as a **pointer**, re-checked against the grants read from the database on every request, so a
grant revoked mid-session stops being honoured at once rather than at the next sign-in. See ADR-0002.

**Activity log entry** (ประวัติการใช้งาน):
One line in `user_log`: an account, what it did, and when. Written where the action happens — signing in and out, and
every change to an account or a grant — and read back per account, newest first, by an administrator who reaches that
account. Deliberately keyless: a log line has no natural key, so ADR-0001's tiers do not apply to it.
_Avoid_: activity — an **Activity** is a piece of assessed work within a Section and is a different thing entirely;
say activity log entry, or history, for this one.

**Scope** (ขอบเขตสิทธิ์):
The faculty, department or program a role grant is confined to. A grant may never exceed the granter's own scope.
A grant that is confined to nothing — a full administrator's — carries the literal `FULL_ADMIN` in place of a code,
never a null. Scope is therefore not a foreign key: the same column names three different tables and one sentinel.

A grant **covers** a record when the grant's scope is the record's own scope or one the record sits inside: a faculty
reaches its departments and their programs, a department reaches its programs, and neither reaches sideways or upward.
Because the column is polymorphic, an identifier is resolved **program, then department, then faculty, first hit
wins** — which is why the faculty carries the code `ENG` rather than a number, so it cannot collide with a numbered
department. An identifier no table claims is covered by nobody, the `FULL_ADMIN` sentinel included.
