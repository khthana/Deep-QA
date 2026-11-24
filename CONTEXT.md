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

**Revision Year** (ปีหลักสูตร):
The Buddhist-era year a Program's curriculum was revised — *หลักสูตรปรับปรุง พ.ศ. 2564*, four digits. A property of the
Program itself, not of anything taught in it.
_Avoid_: academic year — the year an Offering is taught in (`semester_courses.academic_year`), a different fact;
curriculum year, for the same reason *curriculum* is avoided above; program year, which reads as a student's
year of study (ชั้นปี)

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

**Term** (ภาคการศึกษา):
One semester of one academic year, written `ภาค/ปี` — `1/2569` is ภาคต้น of ปีการศึกษา 2569. There are two semesters,
1 ภาคต้น and 2 ภาคปลาย; the owner struck ภาคฤดูร้อน on 17 November 2569. An Offering belongs to exactly one Term. The
**current Term** is read off the date by the faculty's rule (`db/term.js`): June–October is 1, November–May is 2 of
the year that began in June.
_Avoid_: writing the year first (`2569/1`); semester alone when the year matters

**Section** (กลุ่มเรียน):
A teaching group within an Offering, with its own teachers, enrolled students, activities and scores.
_Avoid_: ตอนเรียน — the rebuild's earlier word, replaced by the owner on 17 November 2569 with the delivered
system's กลุ่มเรียน; กลุ่ม alone, which is too easily read as **Work Group** (กลุ่มงาน); class, course

### Learning outcomes

**PLO** (ผลการเรียนรู้ระดับหลักสูตร):
A Program Learning Outcome — what a graduate of a Program should be able to do. Forms a tree of main and sub-outcomes,
typed as knowledge, skills, ethics or character.

**CLO** (ผลการเรียนรู้ระดับรายวิชา):
A Course Learning Outcome — what a Subject teaches towards. Belongs to a (Program, Subject, academic year), so all
Sections of one Offering share a CLO set and each year's set is frozen once scores exist. See
[ADR-0003](./docs/adr/0003-clo-belongs-to-program-subject-year.md).

**Mapping Level** (ระดับการเชื่อมโยง):
How strongly a Subject serves a **main** PLO — the coverage grid (#20) maps at the main-PLO grain, not at
every node of the tree, which #100 settled after fifty-two columns proved unreadable on one printed page.
The cost is stated rather than hidden: the grid can say a Subject serves main PLO 3, not which sub-outcome
of it. On a five-point scale: `I` Introduced, `D` Developed, `P` Practiced,
`A` Assessed, `E` **Not served** — somebody has looked at this named PLO and recorded that this Subject does
not teach towards it.

`E` is a decision, not an absence, and the two are different rows. A Subject nobody has assessed against a
PLO has **no row at all** in `subject_plo_mapping`; `db/migrations/0002` settles this by leaving
`createEmptyMapping` uncalled. So "not yet decided" is silence and `E` is a narrower statement than silence —
the coverage grid (#20) and its PDF both draw them differently, and a report that drew both blank would throw
the distinction away on the one document it exists for. The letter's older reading, `E` for *Empty*, is what
the delivered student system implemented, writing a placeholder row that meant the same thing as silence.

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

**Attribution** (ความเชื่อมโยงกับผลการเรียนรู้):
The rows that say which CLOs an Activity assesses and what share of its mark each one accounts for — the table
`activity_clo_mapping`, one row per CLO. An Activity with no rows is legal and contributes to no outcome, which is why
the share is a percentage of the Activity's own mark rather than a mark typed twice. Weights may total less than 100
(an unfinished attribution) but never more, and a CLO a cohort has been marked under may not be taken off (#33).
_Avoid_: mapping, as the name of the concept — a **PLO Mapping** is the curriculum-level grid and a
different thing, so "the mapping" alone names neither. The table `activity_clo_mapping` and a row of it
keep their own names: prose that says *a mapping row* is naming the table, which is exact, and prose that
says *the mapping* where it means this is not. Also avoid: CLO link

**Teaching Plan** (แผนการสอน):
The week-by-week plan of one **Section** — each row a week number, a topic and optional detail and remarks. Unlike
CLOs and the weighting scheme, it belongs to the Section and not to the Offering, so two Sections of one Offering may
teach the same subject to different plans. An Activity may name the week it belongs to.
_Avoid_: syllabus — the table is `course_syllabus`, but a syllabus in Thai practice (มคอ.3) is the whole course
specification and this is one part of it; course outline

**Week** (สัปดาห์):
One row of a Teaching Plan. The number is the week of the semester as the teacher means it, not a position: it is
typed rather than assigned, two rows may share one, and deleting a row never renumbers the others (ADR-0001, amended
by #31).
_Avoid_: session, period

**Work Group** (กลุ่มงาน):
A group of at most 10 students within a Section for group Activities. A student belongs to at most one Work Group per
Section.
_Avoid_: team, student group, กลุ่ม alone — a **Section** is a กลุ่มเรียน

**Evidence** (หลักฐานการประเมิน):
A PDF attached to an Activity — the brief itself, or a sample of work at each of the four achievement bands.

**Rubric** (Rubric กลาง):
A reusable scoring guide owned by a Program, with weighted criteria described at four levels.

### Roles

**Central Admin** (ผู้ดูแลระบบกลาง, `FULL_ADMIN`):
Manages user accounts and permission grants system-wide, and nothing else. Deliberately has no access to curriculum
data — see [ADR-0002](./docs/adr/0002-server-side-rbac.md).

**Faculty Admin** (ผู้ดูแลระดับคณะ, `FACULTY_ADMIN`):
Manages the Departments of one Faculty, and the user accounts within it — and nothing else: the only role that may
manage Departments, and reaches no Program, Subject or student record. Programs were taken off this role by the owner
on 18 November 2569 ("ผู้ดูแลระดับคณะ ... ให้ทำข้อมูลภาควิชาอย่างเดียว"), which leaves every Program screen to the
Department Admin, who holds one Department.

**Department Admin** (ผู้ดูแลระดับภาควิชา, `DEPT_ADMIN`):
Confined to one Department, and the only role that maintains its Programs: a Program is filed under the Department of
the admin who records it, so there is no Department to choose (18 November 2569). The only role that
maintains Subjects: a subject is what a department teaches, so the department that teaches it owns its catalogue
entry, and a Faculty Admin is refused that screen the way a Department Admin is refused Departments (#61). Placing a
subject into a curriculum is a different thing — that is Program Subjects, shared with the Curriculum Committee and
closed to the Faculty Admin since #79.
Also the only role that maintains the central student register (#17), on the same argument and with the same two
roles refused: a student is admitted to a Department, and a Curriculum Committee owns what a Program teaches rather
than who is admitted to it. Enrolling a student already in the register into a Section is the Teacher's, not this.

**Curriculum Committee** (กรรมการหลักสูตร, `PROG_MANAGER`):
Owns one Program: its PLOs, its Program Subjects, its Offerings, and its Program-level Results. The only role that may
create Offerings.

**Teacher** (อาจารย์ผู้สอน, `TEACHER`):
Owns the Sections they teach: students, Work Groups, CLOs, Activities, scores and Evidence.

**External Assessor** (ผู้ประเมินภายนอก, `EXT_ASSESSOR`):
A time-boxed account for accreditation review. Reads the four Program-level Results screens of one Program — the
Curriculum Committee's own reports, under the Committee's own words — and nothing else: no curriculum documents, no
registers, no Section. Read-only throughout, and scoped by the grant like every other role. That set is not in the
thesis; the requirement owner settled it on 16 October 2569 and it is written down as `docs/01` §9 `OWN-01` (#49).

**Acting grant** (บทบาทที่กำลังใช้งาน):
The single grant a signed-in account is working as right now, out of however many it holds. One person may be a
department administrator and also teach; the two reach different records, so "what may this person do" has no answer
until one of the hats is on. On sign-in the acting grant is the most senior held — lowest `priority` — and the person
may change it to any other grant they hold.

Every authorisation decision reads the acting grant and none reads the full set: holding a grant is not exercising it,
so a teacher acting as a teacher is refused what their administrator grant would have allowed. The selection travels
in the session cookie as a **pointer**, re-checked against the grants read from the database on every request, so a
grant revoked mid-session stops being honoured at once rather than at the next sign-in. See ADR-0002.

Beside the pointer the cookie carries the account's **switch counter** (`users.acting_epoch`), raised by one every
time the person uses the picker — including when they choose the hat they are already wearing, since what it counts
is the cookie being re-issued and not the selection changing. It decides nothing about what anybody may do; it is
there so that a request still in flight when the hat changed cannot re-issue the cookie with the hat it left under.
See ADR-0006.

**Activity log entry** (ประวัติการใช้งาน):
One line in `user_log`: an account, what it did, which record it did it to, and when. Written where the action happens
— signing in and out, and every change to an account or a grant — and read back as one table of every account's
lines, newest first, searchable by the acting account or the record acted on, holding only the lines of accounts the
administrator reaches (#305). The account named by the line is always the one who **acted**: an edit to
someone else's record sits in the editor's history and names the edited record in `target_kind` / `target_id`, so
"what did this person do" and "who touched this record" are both a search of the one table, by the account's id. The target is text and not a reference,
because an audit line has to outlive the record it names. Reads are not logged, by decision — only sign-in, sign-out
and change. Deliberately keyless: a log line has no natural key, so ADR-0001's tiers do not apply to it.
_Avoid_: activity — an **Activity** is a piece of assessed work within a Section and is a different thing entirely;
say activity log entry, or history, for this one.

**Account deletion** (การลบบัญชี):
Taking an account out of the database, as against **deactivating** it, which leaves it in place and refuses its
sign-in. Allowed only for an account nothing refers to: it teaches no Section, authored or last edited no record,
assigned no grant, and its own activity log entries are only about itself — signing in and out, switching the acting
grant, changing its password. Anything else is refused and the account is deactivated instead, because the log lines
it wrote about other records would be deleted with it. Decided by the owner on 22 November 2569; see
`docs/users-screen.md`.
_Avoid_: remove, for a deactivation.

**Scope** (ขอบเขตสิทธิ์):
The faculty, department or program a role grant is confined to. A grant may never exceed the granter's own scope.
A grant that is confined to nothing — a full administrator's — carries the literal `FULL_ADMIN` in place of a code,
never a null. Scope is therefore not a foreign key: the same column names three different tables and one sentinel.

A grant **covers** a record when the grant's scope is the record's own scope or one the record sits inside: a faculty
reaches its departments and their programs, a department reaches its programs, and neither reaches sideways or upward.
Because the column is polymorphic, an identifier is resolved **program, then department, then faculty, first hit
wins** — which is why the faculty carries the code `ENG` rather than a number, so it cannot collide with a numbered
department. An identifier no table claims is covered by nobody, the `FULL_ADMIN` sentinel included.
