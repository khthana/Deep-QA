'use strict';

/**
 * The development and acceptance dataset — ticket #6.
 *
 * It lives beside the migration runner rather than in backend/ because it is
 * the fourth verb on the same schema: db:up brings the container, migrate
 * builds the tables, reset empties them, seed fills them. Putting it in
 * backend/ would also invert the dependency the rebuild has settled on -
 * backend/ reaches into db/, never the other way round.
 *
 * What it builds is the test data docs/04 §1.3 already specifies, so an
 * acceptance run and a test case are talking about the same rows: department
 * 05, programme 0501, subject 01076105, academic year 2568 semester 2, a
 * cohort of 113, PLO-1..PLO-13 with their sub-outcomes, CLO-1..CLO-9, and a
 * weighting of 40/30/30. On top of it sit the named accounts docs/04 §1.2
 * lists, including the deliberately negative ones - a committee member and a
 * department admin scoped elsewhere, a teacher who teaches nothing - so a
 * permission rule can be verified rather than assumed.
 *
 * Three properties are load-bearing and easy to lose:
 *
 *   * It is deterministic. Every name, every mark and every group membership
 *     comes from a seeded generator, never from Math.random, so an acceptance
 *     checklist can say "the third student scored 72" and still be true after a
 *     reset. See `sequence()`.
 *   * It is idempotent. Everything is found-or-created against a natural key,
 *     so a second run changes nothing and reports the same counts. The two
 *     tables with no natural key - activities and student_group - are matched
 *     on the name they carry within their section.
 *   * It is one transaction. A seed that fails halfway leaves a database that
 *     looks seeded and is not, which is worse than one that is plainly empty.
 *
 * Deliberately not seeded: activity_evidence and user_image, which would need
 * real files and, in the inherited system, hold student work; rubrics and the
 * weekly syllabus, which no acceptance criterion of #6 asks for; and the
 * continuous-improvement cycle, which belongs to the ticket that builds its
 * screen.
 */

const bcrypt = require('bcrypt');

const { createPool, schemaName } = require('./pool');
const { currentTerm, BUDDHIST_OFFSET } = require('./term');

/**
 * The password every seeded account shares.
 *
 * Local-only and deliberately uninteresting, in the same spirit as
 * DB_PASS=deep_core_local_only: this seed fills an empty local database, and
 * the account it opens has nothing behind it. README.md documents it, which is
 * the last of #6's acceptance criteria - an acceptance run has to be able to
 * sign in as each role without asking anyone.
 *
 * Cost 10 matches every bcrypt.hash in the inherited backend, so a hash written
 * here and a hash written by the rebuilt sign-up screen are the same shape.
 */
const PASSWORD = 'deep-core-local';
const BCRYPT_COST = 10;

/**
 * The term the seed fills, taken from the calendar rather than written down.
 *
 * These were literals - 2568, 2567, semester 2 - and a literal here is a seed
 * that is right until the term turns and then quietly seeds the past. #24 is
 * what forced the change: its dashboard opens on the current term, so a seed
 * that names any other one gives the person walking the checklist an empty
 * screen and nothing to walk.
 *
 * The prior year is the same semester one year earlier, which keeps the reason
 * it exists intact: #6 asks for a second academic year of completed marks for
 * the same Subject, and a comparison across two different semesters would not
 * be the year-over-year comparison the screens are for.
 *
 * Anything in the suites that needs a term the seed does not occupy derives it
 * from CURRENT_YEAR rather than spelling a number out; three of them did spell
 * it out, and all three would have collided with the seed on 1 June.
 */
const { academicYear: CURRENT_YEAR, semester: SEMESTER } = currentTerm();
const PRIOR_YEAR = String(Number(CURRENT_YEAR) - 1);

/**
 * faculty_id is 'ENG' and not the '01' the university uses, because
 * user_roles.scope_id is polymorphic: findScopeHierarchy resolves it against
 * programs, then departments, then faculty, and stops at the first hit. A
 * faculty and a department both coded '01' would make a faculty-wide grant
 * resolve to one department - silently, and only in the permission layer. The
 * seed picks codes that cannot collide so that a failing permission test means
 * a bug in the permission code.
 */
const FACULTY = {
  id: 'ENG',
  th: 'คณะวิศวกรรมศาสตร์',
  en: 'Faculty of Engineering',
};

const DEPARTMENTS = [
  { id: '05', th: 'วิศวกรรมคอมพิวเตอร์', en: 'Computer Engineering' },
  // docs/04 §1.2's cross-scope department: U_DEPT2 administers it and must see
  // nothing belonging to 05.
  { id: '01', th: 'วิศวกรรมโยธา', en: 'Civil Engineering' },
];

const PROGRAMS = [
  {
    id: '0501',
    th: 'วิศวกรรมคอมพิวเตอร์',
    en: 'Computer Engineering',
    department: '05',
    year: '2564',
  },
  // The cross-scope programme, for U_COM2.
  {
    id: '0503',
    th: 'วิศวกรรมคอมพิวเตอร์ (หลักสูตรนานาชาติ)',
    en: 'Computer Engineering (International Program)',
    department: '05',
    year: '2564',
  },
];

const SUBJECT = {
  id: '01076105',
  th: 'การเขียนโปรแกรมเชิงวัตถุ',
  en: 'OBJECT ORIENTED PROGRAMMING',
  credits: 3,
  department: '05',
};

const PROGRAM = PROGRAMS[0].id;
const PROGRAM_INTL = PROGRAMS[1].id;

/**
 * The six roles of docs/01 §ROLE-1..ROLE-6.
 *
 * priority ascends with seniority, which 0001 recovered from
 * getAllUsersByRolePriority filtering `r.priority >= the viewer's`: a lower
 * number sees more. The numbers are the ROLE-n of docs/01 itself, so the
 * document and the table can be read against each other.
 *
 * EXT_ASSESSOR is the one role_id not found in the inherited code. The students
 * never built ROLE-6, so there is no identifier to recover and this one is
 * chosen - in the shape of the five that exist.
 */
const ROLES = [
  { id: 'FULL_ADMIN', name: 'ผู้ดูแลระบบกลาง', priority: 1 },
  { id: 'FACULTY_ADMIN', name: 'ผู้ดูแลระบบระดับคณะ', priority: 2 },
  { id: 'DEPT_ADMIN', name: 'ผู้ดูแลระบบระดับภาควิชา', priority: 3 },
  { id: 'PROG_MANAGER', name: 'กรรมการหลักสูตร', priority: 4 },
  { id: 'TEACHER', name: 'อาจารย์ผู้สอน', priority: 5 },
  { id: 'EXT_ASSESSOR', name: 'ผู้ประเมินภายนอก', priority: 6 },
];

/**
 * The named accounts of docs/04 §1.2, `alias` being the name the test cases
 * call each one by.
 *
 * A grant's scope_id is whatever tier the role is scoped at: the faculty for
 * FACULTY_ADMIN, the department for DEPT_ADMIN and TEACHER, the programme for
 * PROG_MANAGER and EXT_ASSESSOR. A TEACHER is scoped at their department and
 * not at a section - findTeacher joins departments on scope_id - and which
 * sections they actually teach comes from course_sections_teacher instead,
 * which is what makes U_TEACH2 possible at all.
 *
 * FULL_ADMIN's scope is the literal 'FULL_ADMIN'. The column is NOT NULL and
 * user_rolesController compares against that sentinel, so a global grant says
 * it in the only way the read side understands - 0001 settles this at
 * user_roles.
 */
const ACCOUNTS = [
  {
    alias: 'U_ADMIN',
    id: 'admin01',
    email: 'admin@kmitl.ac.th',
    th: ['นาย', 'สมชาย', 'ผู้ดูแล'],
    en: ['Mr.', 'Somchai', 'Pooduel'],
    department: null,
    program: null,
    grants: [['FULL_ADMIN', 'FULL_ADMIN']],
  },
  {
    alias: 'U_FAC',
    id: 'facadm01',
    email: 'faculty.admin@kmitl.ac.th',
    th: ['นาง', 'สุดา', 'คณะดี'],
    en: ['Mrs.', 'Suda', 'Kanadee'],
    department: '05',
    program: null,
    grants: [['FACULTY_ADMIN', FACULTY.id]],
  },
  {
    alias: 'U_DEPT',
    id: 'deptadm05',
    email: 'dept.admin.05@kmitl.ac.th',
    th: ['นาย', 'ประเสริฐ', 'ภาควิชา'],
    en: ['Mr.', 'Prasert', 'Pakwicha'],
    department: '05',
    program: null,
    grants: [['DEPT_ADMIN', '05']],
  },
  // Cross-scope: administers department 01 and must not reach 05's data.
  {
    alias: 'U_DEPT2',
    id: 'deptadm01',
    email: 'dept.admin.01@kmitl.ac.th',
    th: ['นางสาว', 'วรรณา', 'โยธากิจ'],
    en: ['Ms.', 'Wanna', 'Yothakit'],
    department: '01',
    program: null,
    grants: [['DEPT_ADMIN', '01']],
  },
  {
    alias: 'U_COM',
    id: 'comm0501',
    email: 'prog.manager@kmitl.ac.th',
    th: ['ผศ.', 'ธนากร', 'หลักสูตร'],
    en: ['Asst. Prof.', 'Thanakorn', 'Laksut'],
    department: '05',
    program: '0501',
    grants: [['PROG_MANAGER', '0501']],
  },
  // Cross-scope: sits on programme 0503's committee, not 0501's.
  {
    alias: 'U_COM2',
    id: 'comm0503',
    email: 'prog.manager.0503@kmitl.ac.th',
    th: ['ผศ.', 'ชลธิชา', 'นานาชาติ'],
    en: ['Asst. Prof.', 'Chonthicha', 'Nanachat'],
    department: '05',
    program: '0503',
    grants: [['PROG_MANAGER', '0503']],
  },
  {
    alias: 'U_TEACH',
    id: 'teach01',
    email: 'teacher.one@kmitl.ac.th',
    th: ['ดร.', 'อนันต์', 'สอนดี'],
    en: ['Dr.', 'Anan', 'Sondee'],
    department: '05',
    program: '0501',
    grants: [['TEACHER', '05']],
  },
  // Teaches nothing. Every "a teacher sees only their own sections" test needs
  // an account that should see none at all.
  {
    alias: 'U_TEACH2',
    id: 'teach02',
    email: 'teacher.two@kmitl.ac.th',
    th: ['ดร.', 'ภัทรา', 'ว่างสอน'],
    en: ['Dr.', 'Pattra', 'Wangson'],
    department: '05',
    program: '0501',
    grants: [['TEACHER', '05']],
  },
  {
    alias: 'U_EXT',
    id: 'ext01',
    email: 'external.assessor@kmitl.ac.th',
    th: ['ศ.', 'ไพโรจน์', 'ประเมินผล'],
    en: ['Prof.', 'Pairoj', 'Pramernphol'],
    department: null,
    program: '0501',
    grants: [['EXT_ASSESSOR', '0501']],
  },
  // Two roles at once: R003 / BR-03, the account that has to choose which hat
  // it is wearing on the way in.
  {
    alias: 'U_MULTI',
    id: 'multi01',
    email: 'multi.role@kmitl.ac.th',
    th: ['รศ.', 'กิตติ', 'สองบทบาท'],
    en: ['Assoc. Prof.', 'Kitti', 'Songbotbat'],
    department: '05',
    program: '0501',
    grants: [
      ['PROG_MANAGER', '0501'],
      ['TEACHER', '05'],
    ],
  },
  // R010: an address outside @kmitl.ac.th. An outside assessor is the role
  // that legitimately has one.
  {
    alias: 'U_NONKMITL',
    id: 'outsider1',
    email: 'assessor@tabee-review.org',
    th: ['ดร.', 'เมธา', 'ภายนอก'],
    en: ['Dr.', 'Metha', 'Phainok'],
    department: null,
    program: '0501',
    grants: [['EXT_ASSESSOR', '0501']],
  },
];

const byAlias = (alias) => ACCOUNTS.find((account) => account.alias === alias).id;

/**
 * PLO-1..PLO-13 for programme 0501, each with the sub-outcomes docs/04 §1.3
 * calls for ("PLO-1…PLO-13 พร้อมข้อย่อย เช่น PLO-2-1…PLO-2-7"). `subs` is how
 * many a main outcome has; the codes are its own number and theirs, which is
 * how the screen renders them.
 */
const PLOS = [
  { title: 'มีความรู้พื้นฐานทางคณิตศาสตร์ วิทยาศาสตร์และวิศวกรรมศาสตร์', type: 'knowledge', subs: 3 },
  { title: 'มีความรู้ความเข้าใจในหลักการเขียนโปรแกรมและโครงสร้างข้อมูล', type: 'knowledge', subs: 7 },
  { title: 'มีความรู้ด้านระบบคอมพิวเตอร์ เครือข่ายและฐานข้อมูล', type: 'knowledge', subs: 4 },
  { title: 'มีความรู้ด้านวิศวกรรมซอฟต์แวร์และการประกันคุณภาพ', type: 'knowledge', subs: 3 },
  { title: 'สามารถวิเคราะห์ปัญหาและออกแบบแนวทางแก้ไขเชิงวิศวกรรม', type: 'skills', subs: 4 },
  { title: 'สามารถออกแบบและพัฒนาระบบซอฟต์แวร์ให้ตรงตามความต้องการ', type: 'skills', subs: 3 },
  { title: 'สามารถใช้เครื่องมือและเทคโนโลยีสมัยใหม่ได้อย่างเหมาะสม', type: 'skills', subs: 3 },
  { title: 'สามารถทดสอบและประเมินผลระบบอย่างเป็นระบบ', type: 'skills', subs: 2 },
  { title: 'สามารถสื่อสารและนำเสนอผลงานทางวิชาการได้อย่างมีประสิทธิภาพ', type: 'skills', subs: 2 },
  { title: 'มีจรรยาบรรณในวิชาชีพวิศวกรรมและความรับผิดชอบต่อสังคม', type: 'ethics', subs: 2 },
  { title: 'ตระหนักถึงผลกระทบของเทคโนโลยีต่อสังคมและสิ่งแวดล้อม', type: 'ethics', subs: 2 },
  { title: 'สามารถทำงานร่วมกับผู้อื่นและแสดงภาวะผู้นำได้', type: 'character', subs: 2 },
  { title: 'มีวินัยในการเรียนรู้ด้วยตนเองอย่างต่อเนื่องตลอดชีวิต', type: 'character', subs: 2 },
];

/**
 * A second หลักสูตร's own outcomes, for programme 0503 - #19.
 *
 * Two facts about the screen have nowhere to be seen without this, and both
 * are acceptance criteria rather than decoration.
 *
 * *A code belongs to its หลักสูตร.* `PLO-1` below is a different outcome from
 * 0501's `PLO-1`, with a different title and a different type, and both exist
 * at once. That is the whole of the ticket's fifth criterion and the reason
 * the inherited schema's global uniqueness had to go; on a seed where only one
 * curriculum held outcomes, nothing on any screen could show it.
 *
 * *Display order is a field, not the code.* `PLO-2` is seeded to sort *above*
 * `PLO-1` here. #96 is the lesson: 0501's outcomes have sequence_order equal to
 * their number, so ordering by the field and ordering by the code produce
 * identical output there, and an assertion on either one passes whichever the
 * route actually used. These two rows are the only place in the seed where the
 * two orderings disagree, so they are what makes the fourth criterion provable.
 */
const PLOS_INTL = [
  {
    code: 'PLO-1',
    title: 'มีความรู้ทางวิศวกรรมคอมพิวเตอร์และสื่อสารในบริบทสากลได้',
    type: 'knowledge',
    order: 2,
    subs: [],
  },
  {
    code: 'PLO-2',
    title: 'สามารถทำงานร่วมกับเพื่อนร่วมงานต่างวัฒนธรรมได้',
    type: 'character',
    order: 1,
    subs: ['สื่อสารด้วยภาษาอังกฤษในที่ทำงานได้', 'ปรับตัวเข้ากับทีมข้ามชาติได้'],
  },
];

/**
 * The หลักสูตร's reusable scoring guides - #21.
 *
 * Eleven of them for 0501, which is one more than a page holds, because the
 * ticket's eighth criterion is that the list pages beyond ten rows and a seed
 * of ten proves nothing: the pager would draw itself, say "หน้า 1 จาก 1", and
 * every assertion about it would pass.
 *
 * `order` disagrees with the code on purpose, and in two different ways. RUB-02
 * sorts above RUB-01 and RUB-05 above RUB-04, so ordering by the field and
 * ordering by the code give visibly different lists - #96's lesson, learned in
 * #19 where 0501's outcomes had sequence_order equal to their own number and an
 * assertion on either ordering passed whichever the route actually used.
 *
 * And RUB-06 and RUB-07 are given the *same* order. `display_order` is
 * `NOT NULL DEFAULT 0`, so a tie is the state every rubric starts in rather
 * than an edge case, and a paged list whose ORDER BY does not settle ties can
 * show one row on both pages and another on neither. These two rows are what
 * makes that settlement provable.
 *
 * `criteria` is what #22 will edit. A handful are seeded here because deleting
 * a rubric takes them with it - rubric_details.rubric_id is ON DELETE CASCADE -
 * and a confirmation that warns about criteria needs a rubric that has some.
 */
const RUBRICS = [
  { code: 'RUB-01', th: 'การนำเสนอผลงาน', en: 'Presentation', order: 3, criteria: 3 },
  { code: 'RUB-02', th: 'การเขียนรายงานทางวิชาการ', en: 'Academic report writing', order: 1, criteria: 2 },
  { code: 'RUB-03', th: 'การทำงานเป็นทีม', en: 'Teamwork', order: 2, criteria: 0 },
  { code: 'RUB-04', th: 'การเขียนโปรแกรม', en: 'Programming', order: 5, criteria: 0 },
  { code: 'RUB-05', th: 'การออกแบบระบบ', en: 'System design', order: 4, criteria: 0 },
  { code: 'RUB-06', th: 'การทดสอบซอฟต์แวร์', en: 'Software testing', order: 6, criteria: 0 },
  { code: 'RUB-07', th: 'การวิเคราะห์ปัญหา', en: 'Problem analysis', order: 6, criteria: 0 },
  { code: 'RUB-08', th: 'การใช้เครื่องมือทางวิศวกรรม', en: 'Use of engineering tools', order: 7, criteria: 0 },
  { code: 'RUB-09', th: 'จรรยาบรรณวิชาชีพ', en: 'Professional ethics', order: 8, criteria: 0 },
  { code: 'RUB-10', th: 'การสื่อสารภาษาอังกฤษ', en: 'English communication', order: 9, criteria: 0 },
  { code: 'RUB-11', th: 'การเรียนรู้ด้วยตนเอง', en: 'Self-directed learning', order: 10, criteria: 0 },
];

/**
 * 0503's own two, and their codes do not repeat 0501's.
 *
 * This is where #21 parts company with #19. A PLO code belongs to its
 * หลักสูตร and two curricula each holding a PLO-1 is that ticket's fifth
 * criterion; `rubrics.rubric_code` is UNIQUE on its own, so RUB-01 exists once
 * in the institution and 0503's rubrics have to be numbered elsewhere. A seed
 * that gave both curricula a RUB-01 would not load at all, which is the
 * clearest possible statement of the difference.
 */
const RUBRICS_INTL = [
  { code: 'RUB-51', th: 'การทำงานข้ามวัฒนธรรม', en: 'Cross-cultural collaboration', order: 2, criteria: 0 },
  { code: 'RUB-52', th: 'การนำเสนอเป็นภาษาอังกฤษ', en: 'Presenting in English', order: 1, criteria: 0 },
];

/**
 * How strongly 01076105 serves each PLO. Only the outcomes the subject
 * genuinely touches get a row: 0002 settles that an unmapped subject is one
 * with no rows, and 'E' now means "this named PLO is not served", which is a
 * narrower statement than silence.
 */
const PLO_MAPPING = [
  { plo: 1, level: 'I' },
  { plo: 2, level: 'P' },
  { plo: 3, level: 'D' },
  { plo: 5, level: 'D' },
  { plo: 6, level: 'P' },
  { plo: 7, level: 'I' },
  { plo: 8, level: 'D' },
  { plo: 12, level: 'A' },
];

/**
 * CLO-1..CLO-9 for the subject, and which PLO each serves. Both academic years
 * get their own set, because ADR-0003 puts a CLO at the (Program, Subject,
 * academic year) grain: the 2567 CLOs are the 2567 CLOs, not a reused pointer
 * to this year's.
 */
const CLOS = [
  { detail: 'อธิบายแนวคิดเชิงวัตถุ คลาส และอ็อบเจกต์ได้', plo: 2 },
  { detail: 'ออกแบบคลาสและความสัมพันธ์ระหว่างคลาสจากโจทย์ที่กำหนดได้', plo: 2 },
  { detail: 'ประยุกต์ใช้การสืบทอดและการซ่อนรายละเอียดในการเขียนโปรแกรมได้', plo: 2 },
  { detail: 'ประยุกต์ใช้พอลิมอร์ฟิซึมและอินเทอร์เฟซในการออกแบบโปรแกรมได้', plo: 3 },
  { detail: 'พัฒนาโปรแกรมเชิงวัตถุขนาดกลางให้ทำงานได้ตามข้อกำหนด', plo: 6 },
  { detail: 'วิเคราะห์และแก้ไขข้อผิดพลาดของโปรแกรมเชิงวัตถุได้', plo: 5 },
  { detail: 'ใช้ไลบรารีมาตรฐานและเครื่องมือพัฒนาซอฟต์แวร์ได้อย่างเหมาะสม', plo: 7 },
  { detail: 'ทดสอบหน่วยของโปรแกรมเชิงวัตถุอย่างเป็นระบบได้', plo: 8 },
  { detail: 'ทำงานร่วมกับผู้อื่นและนำเสนอผลงานการพัฒนาโปรแกรมได้', plo: 12 },
];

const LEARNING_ACTIVITIES = ['exam', 'exercise', 'homework', 'assigned_work'];
const COGNITIVE_LEVELS = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];

/** The four bands 0002's CHECK constraint permits, best first. */
const ACHIEVEMENT_LEVELS = [
  { level: 'ดีเยี่ยม', detail: 'ทำได้ครบถ้วนถูกต้องและอธิบายเหตุผลประกอบได้ชัดเจน' },
  { level: 'ดี', detail: 'ทำได้ถูกต้องเป็นส่วนใหญ่ มีข้อบกพร่องเล็กน้อย' },
  { level: 'พอใช้', detail: 'ทำได้ตามเกณฑ์ขั้นต่ำ ยังมีข้อผิดพลาดที่ต้องแก้ไข' },
  { level: 'ต้องปรับปรุง', detail: 'ยังทำไม่ได้ตามเกณฑ์ขั้นต่ำ ต้องทบทวนเนื้อหาใหม่' },
];

/** docs/04 §1.3's weighting: โครงงาน 40 / กลางภาค 30 / ปลายภาค 30 = 100. */
const SCORE_RATIOS = [
  { order: 1, category: 'โครงงาน', weight: 40 },
  { order: 2, category: 'สอบกลางภาค', weight: 30 },
  { order: 3, category: 'สอบปลายภาค', weight: 30 },
];

/**
 * The Activities every section carries, and which CLOs each one assesses.
 * `clos` holds CLO numbers, 1-based; the weights are divided evenly between
 * them so that each Activity's mapping sums to 100 - BR-11, which 0003 leaves
 * to the service layer because it is a sum and not a row-level constraint. A
 * seed that violated it would make every attainment figure computed from it
 * wrong.
 */
/**
 * The one Activity the seed leaves unmapped and unmarked, on purpose - #32.
 *
 * Every other Activity here carries CLO rows and a mark for every enrolled
 * student, which is what the results screens need. That also means every
 * other Activity is *undeletable*: `activity_scores.activity_id` CASCADEs, so
 * #32's route refuses rather than let a delete take a cohort's marks with it.
 * Without this row there would be nothing in the whole seed a person could
 * delete, and the browser cannot make one until #33 builds the editor.
 *
 * So this is a Teacher's freshly created piece of work, before any marking:
 * legal (an Activity with no CLO rows contributes to no outcome, which #33
 * says in as many words), realistic, and the only row #32's successful-delete
 * rows have to work with. `db/test/seed.test.js` exempts it by name from the
 * two invariants it is deliberately outside of, and pins what it is instead.
 *
 * The name bakes the ตอนเรียน and the year for the plan's reason: Activities
 * are Section-bound, and a walk should be able to read that off the screen
 * rather than trust the address.
 */
const UNMARKED_ACTIVITY = {
  category: 'โครงงาน',
  type: 'individual',
  score: 20,
  // The only Activity in the seed carrying dates, and carrying them for the
  // same reason it carries nothing else: so that something proves a date
  // reaches the screen. Every other row leaves both columns NULL, which is
  // legal and which the screen draws as an em dash - a screen that rendered
  // `Invalid Date` would look identical until one real date arrived.
  //
  // August, and not January: `term.js` puts June-October in semester 1 and
  // gives January-May the *previous* academic year, so a January date on a
  // row whose name says ปีการศึกษา 2569 would be a date from 2568's term -
  // the fixture would contradict itself, and the sheet reads the year off
  // that name.
  announcedOn: [8, 10],
  dueOn: [8, 24],
};

/**
 * The fixture's two dates, in the academic year it belongs to.
 *
 * พ.ศ. to ค.ศ. through `term.js`'s own constant rather than a literal 543:
 * one offset, in the file that owns the calendar.
 */
const unmarkedActivityDates = (year) => {
  const gregorian = Number(year) - BUDDHIST_OFFSET;
  const at = ([month, day]) =>
    `${gregorian}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00`;
  return {
    announcement_date: at(UNMARKED_ACTIVITY.announcedOn),
    deadline_date: at(UNMARKED_ACTIVITY.dueOn),
  };
};

const unmarkedActivityName = (sectionNumber, year) =>
  `แบบฝึกหัดท้ายบท (ตอนเรียนที่ ${sectionNumber} ปีการศึกษา ${year})`;

const ACTIVITIES = [
  {
    name: 'โครงงานย่อยที่ 1 — คลาสและอ็อบเจกต์',
    category: 'โครงงาน',
    type: 'group',
    score: 100,
    clos: [1, 2],
  },
  {
    name: 'โครงงานย่อยที่ 2 — การสืบทอดและพอลิมอร์ฟิซึม',
    category: 'โครงงาน',
    type: 'group',
    score: 100,
    clos: [3, 4],
  },
  {
    name: 'โครงงานปลายภาค',
    category: 'โครงงาน',
    type: 'group',
    score: 100,
    clos: [5, 8, 9],
  },
  {
    name: 'สอบกลางภาค',
    category: 'สอบกลางภาค',
    type: 'individual',
    score: 100,
    clos: [1, 3, 6],
  },
  {
    name: 'สอบปลายภาค',
    category: 'สอบปลายภาค',
    type: 'individual',
    score: 100,
    clos: [5, 6, 7],
  },
];

/**
 * The weekly teaching plan every section carries - #31. Three weeks, one per
 * shape the screen draws: a full row, a row with no remark, and a title alone.
 * `composePlanWeek` bakes the section number and year into the text because
 * the plan's grain is the Section - two sections of one Offering must read
 * differently on a screen, and so must two years, or a grain test has nothing
 * to see (the behaviour/criteria seeds are identical across years by
 * construction, and their acceptance walks had to prove year isolation by
 * editing instead of reading).
 */
const TEACHING_PLAN = [
  {
    week_no: 1,
    title: 'แนะนำรายวิชาและแนวคิดเชิงวัตถุ',
    description: 'ภาพรวมรายวิชา เกณฑ์การวัดผล และเครื่องมือที่ใช้ตลอดภาคเรียน',
    remark: 'ยังไม่มีการเก็บคะแนนในสัปดาห์นี้',
  },
  {
    week_no: 2,
    title: 'คลาสและอ็อบเจกต์',
    description: 'การประกาศคลาส สมาชิก และการสร้างอ็อบเจกต์',
    remark: null,
  },
  { week_no: 3, title: 'การสืบทอดและการซ่อนรายละเอียด', description: null, remark: null },
];

/**
 * The activity the seed attaches to week 1 of every section's plan, so that
 * #31's delete guard has a referenced week to refuse - the foreign key is
 * SET NULL, so without a seeded reference the guard could only be tested by
 * building the reference first.
 */
const PLAN_REFERENCED_ACTIVITY = 'สอบกลางภาค';

/** One plan row as the seed writes it - tests assert against this, not a copy. */
function composePlanWeek(spec, sectionNumber, year) {
  return {
    week_no: spec.week_no,
    title: `${spec.title} (ตอนเรียนที่ ${sectionNumber} ปีการศึกษา ${year})`,
    description: spec.description,
    remark: spec.remark,
  };
}

/** The whole seeded plan of one section, in week order. */
const planWeeksFor = (sectionNumber, year) =>
  TEACHING_PLAN.map((spec) => composePlanWeek(spec, sectionNumber, year));

/**
 * The two cohorts. docs/04 §1.3 gives the current year 113 students; the prior
 * year is smaller and is there for one reason - #6 asks for "a second academic
 * year of completed marks ... for the same Subject", which is what the
 * year-over-year comparison screens need two of.
 *
 * Each cohort has its own students. The same person does not sit the same
 * subject twice, and a shared cohort would make "compare 2567 with 2568" a
 * comparison of one group with itself.
 *
 * `year` follows the clock and `admission` deliberately does not. The two were
 * written two apart, and deriving the admission year as well would rewrite every
 * seeded student code once a year - and `backend/test/students.test.js` reads
 * `66010001` and `65010001` back by name, because "the admission year is derived
 * from the code" is a claim that needs a code written down to be a claim at all.
 * So the cohorts drift apart in age as the clock moves, which is what a cohort
 * does: 2566 sitting a subject in 2569 is a fourth year, and nothing in the
 * system reads the gap.
 */
const COHORTS = [
  {
    year: CURRENT_YEAR,
    admission: '2566',
    idPrefix: '66',
    students: 113,
    sections: [
      { number: '1', teacher: 'U_TEACH' },
      { number: '2', teacher: 'U_MULTI' },
    ],
  },
  {
    year: PRIOR_YEAR,
    admission: '2565',
    idPrefix: '65',
    students: 60,
    sections: [{ number: '1', teacher: 'U_TEACH' }],
  },
];

/** BR-06: at most ten students to a work group. Eight leaves the boundary visible. */
const GROUP_SIZE = 8;
const MAX_GROUP_SIZE = 10;

/**
 * Students at the end of each roll left out of the grouping — #26.
 *
 * A fully grouped class is a fixture on which the กลุ่มงาน screen can do
 * nothing: every one of its actions starts by choosing somebody to put in a
 * group, and BR-07 says that somebody must not already be in one. So a few of
 * each roll are left out, and they are not a contrivance - a class always has
 * the people who enrolled after the groups were drawn up.
 *
 * Eleven, and the number is BR-06's rather than a taste: the only way a
 * browser or a person can prove the ceiling is to stand a group at ten and be
 * refused the eleventh, and the only students they can build that group from
 * are the ones no group holds. Ten fills a group and the eleventh is the one
 * that gets refused, which is the largest thing this fixture has to be able to
 * do. Everything else - adding somebody, moving them, taking them out again -
 * is one or two of the same pool.
 */
const UNGROUPED_TAIL = MAX_GROUP_SIZE + 1;

const FIRST_NAMES = [
  'ณัฐพล', 'ศิริพร', 'ธนวัฒน์', 'พิมพ์ชนก', 'กิตติศักดิ์', 'อารยา', 'ชนาธิป', 'ปวีณา',
  'ภาณุพงศ์', 'สุภาวดี', 'วรเมธ', 'ณิชากร', 'อดิศร', 'เบญจวรรณ', 'ปรมินทร์', 'ธัญญาเรศ',
  'สรวิศ', 'กมลชนก', 'จิรายุ', 'นภัสสร',
];

const LAST_NAMES = [
  'ใจดี', 'ศรีสุข', 'วงศ์สว่าง', 'แสงทอง', 'บุญมี', 'พงษ์เจริญ', 'รัตนกุล', 'อินทรีย์',
  'สมบูรณ์', 'ทองคำ', 'เกษมสุข', 'ชัยมงคล', 'ปัญญาดี', 'มณีรัตน์', 'สุวรรณชาติ',
  'ธนบดี', 'เจริญพร', 'ภูวนาถ', 'อุดมทรัพย์', 'พูนผล',
];

/**
 * A deterministic pseudo-random sequence.
 *
 * Not Math.random, and not for a cryptographic reason: the acceptance
 * checklists in docs/04 refer to particular students and particular marks, and
 * a dataset that came out differently on every reset would make each of those
 * references true only once. A linear congruential generator is the smallest
 * thing that gives the same numbers in the same order every time.
 */
function sequence(seedValue) {
  let state = seedValue >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/**
 * Finds a row by its natural key, and inserts it if it is not there.
 *
 * This is what makes the seed re-runnable. Most tables could say the same with
 * ON CONFLICT DO NOTHING, but that returns nothing on the conflict and the
 * generated id is exactly what the next insert needs, so every one of them
 * would need the select anyway.
 */
async function findOrCreate(client, { find, findParams, insert, insertParams }) {
  const existing = await client.query(find, findParams);
  if (existing.rows.length > 0) return existing.rows[0];

  const created = await client.query(insert, insertParams);
  return created.rows[0];
}

/**
 * Inserts many rows in one statement, in chunks.
 *
 * The cohort's marks are a few thousand rows, and a round trip each would make
 * the seed take minutes rather than seconds. The chunk keeps the parameter
 * count under PostgreSQL's limit of 65535 per statement.
 *
 * `conflictTarget` is optional, and omitting it is not the same as passing the
 * primary key: a table whose only key is a generated surrogate has no conflict
 * to arbitrate, and an ON CONFLICT naming it would be a clause that can never
 * fire. Those callers guard re-runs before they get here.
 */
async function insertMany(client, { table, columns, rows, conflictTarget = null }) {
  if (rows.length === 0) return 0;

  const perStatement = Math.floor(60000 / columns.length);
  let written = 0;

  for (let offset = 0; offset < rows.length; offset += perStatement) {
    const chunk = rows.slice(offset, offset + perStatement);
    const values = chunk
      .map(
        (_, rowIndex) =>
          `(${columns.map((__, columnIndex) => `$${rowIndex * columns.length + columnIndex + 1}`).join(', ')})`,
      )
      .join(', ');

    const result = await client.query(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${values}
       ${conflictTarget ? `ON CONFLICT (${conflictTarget}) DO NOTHING` : ''}`,
      chunk.flat(),
    );
    written += result.rowCount;
  }

  return written;
}

// ─────────────────────────────────────────────────────────────
// The seed itself, in the order the foreign keys require
// ─────────────────────────────────────────────────────────────

async function seedOrganisation(client) {
  await client.query(
    `INSERT INTO faculty (faculty_id, faculty_name_en, faculty_name_th)
     VALUES ($1, $2, $3) ON CONFLICT (faculty_id) DO NOTHING`,
    [FACULTY.id, FACULTY.en, FACULTY.th],
  );

  for (const department of DEPARTMENTS) {
    await client.query(
      `INSERT INTO departments (department_id, department_name_en, department_name_th, faculty_id)
       VALUES ($1, $2, $3, $4) ON CONFLICT (department_id) DO NOTHING`,
      [department.id, department.en, department.th, FACULTY.id],
    );
  }

  for (const program of PROGRAMS) {
    await client.query(
      `INSERT INTO programs (program_id, program_name_en, program_name_th, department_id, year)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (program_id) DO NOTHING`,
      [program.id, program.en, program.th, program.department, program.year],
    );
  }
}

async function seedAccounts(client) {
  for (const role of ROLES) {
    await client.query(
      `INSERT INTO roles (role_id, role_name, priority)
       VALUES ($1, $2, $3) ON CONFLICT (role_id) DO NOTHING`,
      [role.id, role.name, role.priority],
    );
  }

  // One hash for one password, rather than one per account: bcrypt at cost 10
  // is deliberately slow, and eleven of them is eleven times slower for no
  // property this dataset needs. Each account still gets its own row, and the
  // salt inside the hash is still random - it is the same salt for all of
  // them, which matters only if these were real credentials.
  const hashed = await bcrypt.hash(PASSWORD, BCRYPT_COST);

  for (const account of ACCOUNTS) {
    const [titleTh, firstTh, lastTh] = account.th;
    const [titleEn, firstEn, lastEn] = account.en;

    await client.query(
      `INSERT INTO users (
         user_id, email, title_th, first_name_th, last_name_th,
         title_en, first_name_en, last_name_en,
         department_id, program_id, is_verified, password
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11)
       ON CONFLICT (user_id) DO NOTHING`,
      [
        account.id,
        account.email,
        titleTh,
        firstTh,
        lastTh,
        titleEn,
        firstEn,
        lastEn,
        account.department,
        account.program,
        hashed,
      ],
    );

    for (const [roleId, scopeId] of account.grants) {
      await client.query(
        `INSERT INTO user_roles (user_id, role_id, scope_id, assigned_by)
         VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, role_id, scope_id) DO NOTHING`,
        [account.id, roleId, scopeId, byAlias('U_ADMIN')],
      );
    }
  }
}

async function seedSubject(client) {
  const admin = byAlias('U_ADMIN');

  await client.query(
    `INSERT INTO subjects (
       subject_id, subject_name_en, subject_name_th, credits, description_th, department_id, created_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (subject_id) DO NOTHING`,
    [
      SUBJECT.id,
      SUBJECT.en,
      SUBJECT.th,
      SUBJECT.credits,
      'หลักการเขียนโปรแกรมเชิงวัตถุ คลาส อ็อบเจกต์ การสืบทอด พอลิมอร์ฟิซึม และการออกแบบโปรแกรมขนาดกลาง',
      SUBJECT.department,
      admin,
    ],
  );

  // Every table at the (Program, Subject) grain and below points at this pair,
  // so it has to exist before any of them.
  await client.query(
    `INSERT INTO program_subjects (program_id, subject_id, subject_type, created_by)
     VALUES ($1, $2, 'required', $3) ON CONFLICT (program_id, subject_id) DO NOTHING`,
    [PROGRAM, SUBJECT.id, admin],
  );
}

/** The PLO tree, returning the outcome_id of each main outcome by its number. */
async function seedLearningOutcomes(client) {
  const committee = byAlias('U_COM');
  const mainOutcomeIds = new Map();

  for (const [index, plo] of PLOS.entries()) {
    const number = index + 1;
    const code = `PLO-${number}`;

    const main = await findOrCreate(client, {
      find: `SELECT outcome_id FROM learning_outcomes WHERE program_id = $1 AND outcome_code = $2`,
      findParams: [PROGRAM, code],
      insert: `INSERT INTO learning_outcomes (
                 program_id, outcome_code, outcome_title, outcome_type,
                 sequence_order, level_depth, is_expanded, created_by
               )
               VALUES ($1, $2, $3, $4, $5, 1, true, $6) RETURNING outcome_id`,
      insertParams: [PROGRAM, code, plo.title, plo.type, number, committee],
    });

    mainOutcomeIds.set(number, main.outcome_id);

    for (let sub = 1; sub <= plo.subs; sub += 1) {
      const subCode = `PLO-${number}-${sub}`;
      await findOrCreate(client, {
        find: `SELECT outcome_id FROM learning_outcomes WHERE program_id = $1 AND outcome_code = $2`,
        findParams: [PROGRAM, subCode],
        insert: `INSERT INTO learning_outcomes (
                   program_id, outcome_code, outcome_title, outcome_type,
                   parent_outcome_id, sequence_order, level_depth, created_by
                 )
                 VALUES ($1, $2, $3, $4, $5, $6, 2, $7) RETURNING outcome_id`,
        insertParams: [
          PROGRAM,
          subCode,
          `${plo.title} (ข้อย่อยที่ ${sub})`,
          plo.type,
          main.outcome_id,
          sub,
          committee,
        ],
      });
    }
  }

  // The second curriculum's own tree. Committed by its own committee member,
  // because who wrote an outcome is part of what the screen shows.
  const committee2 = byAlias('U_COM2');
  for (const plo of PLOS_INTL) {
    const main = await findOrCreate(client, {
      find: `SELECT outcome_id FROM learning_outcomes WHERE program_id = $1 AND outcome_code = $2`,
      findParams: [PROGRAM_INTL, plo.code],
      insert: `INSERT INTO learning_outcomes (
                 program_id, outcome_code, outcome_title, outcome_type,
                 sequence_order, level_depth, is_expanded, created_by
               )
               VALUES ($1, $2, $3, $4, $5, 1, true, $6) RETURNING outcome_id`,
      insertParams: [PROGRAM_INTL, plo.code, plo.title, plo.type, plo.order, committee2],
    });

    for (const [index, title] of plo.subs.entries()) {
      await findOrCreate(client, {
        find: `SELECT outcome_id FROM learning_outcomes WHERE program_id = $1 AND outcome_code = $2`,
        findParams: [PROGRAM_INTL, `${plo.code}-${index + 1}`],
        insert: `INSERT INTO learning_outcomes (
                   program_id, outcome_code, outcome_title, outcome_type,
                   parent_outcome_id, sequence_order, level_depth, created_by
                 )
                 VALUES ($1, $2, $3, $4, $5, $6, 2, $7) RETURNING outcome_id`,
        insertParams: [
          PROGRAM_INTL,
          `${plo.code}-${index + 1}`,
          title,
          plo.type,
          main.outcome_id,
          index + 1,
          committee2,
        ],
      });
    }
  }

  for (const mapping of PLO_MAPPING) {
    await client.query(
      `INSERT INTO subject_plo_mapping (program_id, subject_id, outcome_id, mapping_level, created_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (program_id, subject_id, outcome_id) DO NOTHING`,
      [PROGRAM, SUBJECT.id, mainOutcomeIds.get(mapping.plo), mapping.level, committee],
    );
  }

  return mainOutcomeIds;
}

/**
 * The rubrics of both curricula, and the criteria of the two that have any.
 *
 * Written by each หลักสูตร's own committee member, because who last touched a
 * rubric is a column the screen shows.
 */
async function seedRubrics(client) {
  const sets = [
    { rubrics: RUBRICS, program: PROGRAM, author: byAlias('U_COM') },
    { rubrics: RUBRICS_INTL, program: PROGRAM_INTL, author: byAlias('U_COM2') },
  ];

  for (const { rubrics, program, author } of sets) {
    for (const rubric of rubrics) {
      const row = await findOrCreate(client, {
        find: `SELECT id FROM rubrics WHERE rubric_code = $1`,
        findParams: [rubric.code],
        insert: `INSERT INTO rubrics (
                   rubric_code, rubric_name_th, rubric_name_en, program_id,
                   display_order, created_by, updated_by
                 )
                 VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING id`,
        insertParams: [rubric.code, rubric.th, rubric.en, program, rubric.order, author],
      });

      for (let n = 1; n <= rubric.criteria; n += 1) {
        await findOrCreate(client, {
          find: `SELECT id FROM rubric_details WHERE rubric_id = $1 AND display_order = $2`,
          findParams: [row.id, n],
          insert: `INSERT INTO rubric_details (
                     rubric_id, criteria_name_th, criteria_name_en, weight,
                     level_4_description, level_3_description,
                     level_2_description, level_1_description,
                     display_order, created_by, updated_by
                   )
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10) RETURNING id`,
          insertParams: [
            row.id,
            `${rubric.th} — เกณฑ์ที่ ${n}`,
            `${rubric.en} — criterion ${n}`,
            1,
            'ทำได้ครบถ้วนและดีเยี่ยม',
            'ทำได้ครบถ้วน',
            'ทำได้บางส่วน',
            'ยังทำไม่ได้',
            n,
            author,
          ],
        });
      }
    }
  }
}

/**
 * One year's CLOs, their measurable behaviours and achievement criteria, and
 * the weighting scheme they are marked under. All four are at ADR-0003's
 * grain, so each academic year gets its own.
 */
async function seedOutcomesForYear(client, { year, mainOutcomeIds }) {
  const teacher = byAlias('U_TEACH');
  const cloIds = new Map();

  for (const [index, clo] of CLOS.entries()) {
    const number = index + 1;
    const code = `CLO-${number}`;

    const row = await findOrCreate(client, {
      find: `SELECT clo_id FROM subject_clo
             WHERE program_id = $1 AND subject_id = $2 AND academic_year = $3 AND clo_number = $4`,
      findParams: [PROGRAM, SUBJECT.id, year, code],
      insert: `INSERT INTO subject_clo (
                 program_id, subject_id, academic_year, clo_number, clo_detail,
                 teaching_method, assessment_method, plo_id, created_by, updated_by
               )
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9) RETURNING clo_id`,
      insertParams: [
        PROGRAM,
        SUBJECT.id,
        year,
        code,
        clo.detail,
        'บรรยาย ปฏิบัติในห้องปฏิบัติการ และมอบหมายโครงงานกลุ่ม',
        'สอบข้อเขียน ตรวจผลงานโครงงาน และประเมินการนำเสนอ',
        mainOutcomeIds.get(clo.plo),
        teacher,
      ],
    });

    cloIds.set(number, row.clo_id);

    for (let behaviour = 1; behaviour <= 2; behaviour += 1) {
      await client.query(
        `INSERT INTO subject_clo_measurable_behavior (
           clo_id, behavior_no, behavior_detail, learning_activity, cognitive_level
         )
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (clo_id, behavior_no) DO NOTHING`,
        [
          row.clo_id,
          behaviour,
          `${clo.detail} (พฤติกรรมที่วัดได้ข้อ ${behaviour})`,
          LEARNING_ACTIVITIES[(index + behaviour) % LEARNING_ACTIVITIES.length],
          COGNITIVE_LEVELS[(index + behaviour) % COGNITIVE_LEVELS.length],
        ],
      );
    }

    for (const [criteriaIndex, band] of ACHIEVEMENT_LEVELS.entries()) {
      await client.query(
        `INSERT INTO subject_clo_achievement_criteria (
           clo_id, criteria_no, achievement_level, criteria_detail, criteria_description
         )
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (clo_id, criteria_no) DO NOTHING`,
        [
          row.clo_id,
          criteriaIndex + 1,
          band.level,
          band.detail,
          `เกณฑ์ระดับ${band.level}ของ ${code}`,
        ],
      );
    }
  }

  const ratioIds = new Map();
  for (const ratio of SCORE_RATIOS) {
    const row = await findOrCreate(client, {
      find: `SELECT score_ratio_id FROM subject_score_ratio
             WHERE program_id = $1 AND subject_id = $2 AND academic_year = $3 AND score_category = $4`,
      findParams: [PROGRAM, SUBJECT.id, year, ratio.category],
      insert: `INSERT INTO subject_score_ratio (
                 program_id, subject_id, academic_year, sequence_order, score_category, weight
               )
               VALUES ($1, $2, $3, $4, $5, $6) RETURNING score_ratio_id`,
      insertParams: [PROGRAM, SUBJECT.id, year, ratio.order, ratio.category, ratio.weight],
    });
    ratioIds.set(ratio.category, row.score_ratio_id);
  }

  return { cloIds, ratioIds };
}

/** The offering, its sections and the teachers assigned to them. */
async function seedOffering(client, cohort) {
  const offering = await findOrCreate(client, {
    find: `SELECT id FROM semester_courses
           WHERE program_id = $1 AND subject_id = $2 AND academic_year = $3 AND semester = $4`,
    findParams: [PROGRAM, SUBJECT.id, cohort.year, SEMESTER],
    insert: `INSERT INTO semester_courses (program_id, subject_id, academic_year, semester)
             VALUES ($1, $2, $3, $4) RETURNING id`,
    insertParams: [PROGRAM, SUBJECT.id, cohort.year, SEMESTER],
  });

  const sections = [];
  for (const spec of cohort.sections) {
    const section = await findOrCreate(client, {
      find: `SELECT section_id FROM course_sections
             WHERE semester_course_id = $1 AND section_number = $2`,
      findParams: [offering.id, spec.number],
      insert: `INSERT INTO course_sections (semester_course_id, section_number)
               VALUES ($1, $2) RETURNING section_id`,
      insertParams: [offering.id, spec.number],
    });

    await client.query(
      `INSERT INTO course_sections_teacher (section_id, user_id)
       VALUES ($1, $2) ON CONFLICT (section_id, user_id) DO NOTHING`,
      [section.section_id, byAlias(spec.teacher)],
    );

    sections.push({ id: section.section_id, number: spec.number, teacher: spec.teacher });
  }

  return { offeringId: offering.id, sections };
}

/**
 * The cohort, spread across the offering's sections. Returns each section's
 * enrolled students in a stable order, which is what makes the work groups and
 * the marks reproducible.
 */
async function seedCohort(client, cohort, sections) {
  const pick = sequence(Number(cohort.idPrefix) * 7919);
  const enrolled = sections.map(() => []);

  const students = [];
  const enrolments = [];

  for (let index = 0; index < cohort.students; index += 1) {
    const studentId = `${cohort.idPrefix}01${String(index + 1).padStart(4, '0')}`;
    const first = FIRST_NAMES[Math.floor(pick() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(pick() * LAST_NAMES.length)];
    const sectionIndex = index % sections.length;

    students.push([studentId, first, last, SUBJECT.department, PROGRAM, cohort.admission]);
    enrolments.push([studentId, sections[sectionIndex].id]);
    enrolled[sectionIndex].push(studentId);
  }

  await insertMany(client, {
    table: 'student',
    columns: [
      'student_id',
      'first_name_th',
      'last_name_th',
      'department_id',
      'program_id',
      'admission_year',
    ],
    rows: students,
    conflictTarget: 'student_id',
  });

  await insertMany(client, {
    table: 'student_course',
    columns: ['student_id', 'section_id'],
    rows: enrolments,
    conflictTarget: 'student_id, section_id',
  });

  return enrolled;
}

/**
 * The section's Activities, their CLO mappings, and every enrolled student's
 * mark on each. Marks are the point of the whole dataset: an attainment screen
 * with no marks behind it renders an empty state, which is the one thing an
 * acceptance run cannot check.
 */
async function seedAssessment(client, { section, students, cloIds, ratioIds, year }) {
  const roll = sequence(section.id * 104729 + Number(year));
  const marks = [];
  let activityCount = 0;

  for (const spec of ACTIVITIES) {
    const activity = await findOrCreate(client, {
      find: `SELECT id FROM activities WHERE section_id = $1 AND activity_name = $2`,
      findParams: [section.id, spec.name],
      insert: `INSERT INTO activities (
                 section_id, score_ratio_id, activity_type, activity_name,
                 description, score_number
               )
               VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      insertParams: [
        section.id,
        ratioIds.get(spec.category),
        spec.type,
        spec.name,
        `${spec.name} ของตอนเรียนที่ ${section.number} ปีการศึกษา ${year}`,
        spec.score,
      ],
    });
    activityCount += 1;

    // Even weights, with the remainder on the first CLO so the mapping sums to
    // exactly 100 rather than to 99.
    const share = Math.floor(100 / spec.clos.length);
    const weights = spec.clos.map((_, index) =>
      index === 0 ? 100 - share * (spec.clos.length - 1) : share,
    );

    for (const [index, cloNumber] of spec.clos.entries()) {
      const cloId = cloIds.get(cloNumber);
      const portion = Number(((spec.score * weights[index]) / 100).toFixed(2));

      // Found-or-created rather than ON CONFLICT: this table's unique
      // constraint is DEFERRABLE - 0003 made it so, because reordering the
      // criteria passes through a legal duplicate - and a deferrable
      // constraint cannot arbitrate an ON CONFLICT (SQLSTATE 55000).
      await findOrCreate(client, {
        find: `SELECT id FROM activity_clo_mapping WHERE activity_id = $1 AND sequence_order = $2`,
        findParams: [activity.id, index + 1],
        insert: `INSERT INTO activity_clo_mapping (
                   activity_id, sequence_order, clo_id, weight, score_ratio_id, score
                 )
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        insertParams: [
          activity.id,
          index + 1,
          cloId,
          weights[index],
          ratioIds.get(spec.category),
          portion,
        ],
      });

      for (const studentId of students) {
        // A plausible spread rather than a uniform one: most of the cohort
        // between 60% and 95% of what is on offer, so a distribution chart has
        // a shape and a "below target" filter returns something.
        const attainment = 0.55 + roll() * 0.45;
        marks.push([studentId, activity.id, cloId, Number((portion * attainment).toFixed(2))]);
      }
    }
  }

  const written = await insertMany(client, {
    table: 'activity_scores',
    columns: ['student_id', 'activity_id', 'clo_id', 'score'],
    rows: marks,
    conflictTarget: 'student_id, activity_id, clo_id',
  });

  // Last, and outside both loops above: the unmapped, unmarked one. See
  // UNMARKED_ACTIVITY - it is the only Activity in the seed that can be
  // deleted, and it is that precisely because nothing points at it.
  const dates = unmarkedActivityDates(year);
  await findOrCreate(client, {
    find: `SELECT id FROM activities WHERE section_id = $1 AND activity_name = $2`,
    findParams: [section.id, unmarkedActivityName(section.number, year)],
    insert: `INSERT INTO activities (
               section_id, score_ratio_id, activity_type, activity_name,
               description, score_number, announcement_date, deadline_date
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    insertParams: [
      section.id,
      ratioIds.get(UNMARKED_ACTIVITY.category),
      UNMARKED_ACTIVITY.type,
      unmarkedActivityName(section.number, year),
      'ใบงานที่เพิ่งสร้าง ยังไม่ได้ผูกกับผลการเรียนรู้และยังไม่ได้บันทึกคะแนน',
      UNMARKED_ACTIVITY.score,
      dates.announcement_date,
      dates.deadline_date,
    ],
  });
  activityCount += 1;

  return { activities: activityCount, marks: written };
}

/**
 * The section's weekly plan, and the one activity attached to week 1.
 *
 * Found-or-created on (section_id, week_no): the schema deliberately has no
 * unique key there - one week may hold several topics - but the seed writes
 * one row per week, so the pair is a natural key *of the seed's own rows* and
 * makes the rerun a no-op. Runs after seedAssessment because the attachment
 * needs the activity to exist.
 */
async function seedTeachingPlan(client, { section, year, performedBy }) {
  let firstWeekId = null;

  for (const spec of TEACHING_PLAN) {
    const week = composePlanWeek(spec, section.number, year);
    const row = await findOrCreate(client, {
      find: `SELECT id FROM course_syllabus WHERE section_id = $1 AND week_no = $2`,
      findParams: [section.id, week.week_no],
      insert: `INSERT INTO course_syllabus (
                 section_id, week_no, title, description, remark, created_by
               )
               VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      insertParams: [section.id, week.week_no, week.title, week.description, week.remark, performedBy],
    });
    if (firstWeekId === null) firstWeekId = row.id;
  }

  await client.query(
    `UPDATE activities SET course_syllabus_id = $1
      WHERE section_id = $2 AND activity_name = $3 AND course_syllabus_id IS DISTINCT FROM $1`,
    [firstWeekId, section.id, PLAN_REFERENCED_ACTIVITY],
  );
}

/**
 * Work groups for one section: BR-06's ten-student ceiling respected, and
 * BR-07 honoured by construction - the roll is walked once and each student is
 * placed in exactly one group.
 *
 * The change log gets the CREATE_GROUP and ADD_STUDENT rows that creating a
 * group with members produces. A seeded group with no history is a state the
 * application itself cannot reach, and the history modal is read straight from
 * this table.
 */
async function seedWorkGroups(client, { section, students, performedBy }) {
  let created = 0;
  let memberCount = 0;

  // The last few of the roll are not grouped at all - UNGROUPED_TAIL says why.
  const grouped = students.slice(0, Math.max(students.length - UNGROUPED_TAIL, 0));

  // The roll is divided into as few groups as the ceiling allows and then
  // spread evenly across them, rather than filled eight at a time. Filling
  // leaves the remainder in a group of its own - a section of 57 ends with a
  // group of one - and a work group with one student in it is not a fixture
  // anything can be tested against.
  const groupCount = Math.ceil(grouped.length / GROUP_SIZE);

  for (let number = 1; number <= groupCount; number += 1) {
    const members = grouped.slice(
      Math.floor(((number - 1) * grouped.length) / groupCount),
      Math.floor((number * grouped.length) / groupCount),
    );
    const name = `กลุ่มที่ ${number}`;

    // Not findOrCreate: the point of the lookup is the `continue`, which skips
    // the members and the log rows as well as the group itself. The helper
    // would hand back the existing group and let them be written twice.
    const existing = await client.query(
      `SELECT group_id FROM student_group WHERE section_id = $1 AND group_name = $2`,
      [section.id, name],
    );
    if (existing.rows.length > 0) continue;

    const { rows } = await client.query(
      `INSERT INTO student_group (section_id, group_name) VALUES ($1, $2) RETURNING group_id`,
      [section.id, name],
    );
    const groupId = rows[0].group_id;
    created += 1;

    await client.query(
      `INSERT INTO student_group_change_log (
         section_id, group_id, group_name, action_type, new_group_id, performed_by
       )
       VALUES ($1, $2, $3, 'CREATE_GROUP', $2, $4)`,
      [section.id, groupId, name, performedBy],
    );

    memberCount += await insertMany(client, {
      table: 'student_group_member',
      columns: ['group_id', 'student_id'],
      rows: members.map((studentId) => [groupId, studentId]),
      conflictTarget: 'group_id, student_id',
    });

    await insertMany(client, {
      table: 'student_group_change_log',
      columns: [
        'section_id',
        'group_id',
        'group_name',
        'student_id',
        'action_type',
        'new_group_id',
        'performed_by',
      ],
      // No conflict target: a log line has no natural key - 0003 says so, and
      // says why. The `continue` above is what keeps a second run from writing
      // this twice.
      rows: members.map((studentId) => [
        section.id,
        groupId,
        name,
        studentId,
        'ADD_STUDENT',
        groupId,
        performedBy,
      ]),
    });
  }

  return { groups: created, members: memberCount };
}

/**
 * What the seeded schema now holds, rather than what this run happened to
 * write. The difference shows on a second run, which writes nothing: a summary
 * counting insertions would report an empty dataset over a full one.
 */
async function summarise(client) {
  const { rows } = await client.query(`
    SELECT
      (SELECT count(*) FROM users)                AS accounts,
      (SELECT count(*) FROM student)              AS students,
      (SELECT count(*) FROM course_sections)      AS sections,
      (SELECT count(*) FROM activities)           AS activities,
      (SELECT count(*) FROM course_syllabus)      AS plan_weeks,
      (SELECT count(*) FROM activity_scores)      AS marks,
      (SELECT count(*) FROM student_group)        AS groups,
      (SELECT count(*) FROM student_group_member) AS group_members
  `);

  return Object.fromEntries(Object.entries(rows[0]).map(([key, value]) => [key, Number(value)]));
}

/**
 * Fills an empty, migrated schema with the whole dataset, in one transaction.
 *
 * Re-running it is safe and changes nothing: every row is found-or-created
 * against a natural key. Re-running it after `npm run reset && npm run migrate`
 * rebuilds it identically, which is #6's first acceptance criterion.
 */
async function seed({ schema } = {}) {
  const target = schemaName(schema ?? process.env.DB_SCHEMA);
  const pool = createPool({ schema: target });
  let counts;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await seedOrganisation(client);
    await seedAccounts(client);
    await seedSubject(client);
    const mainOutcomeIds = await seedLearningOutcomes(client);
    await seedRubrics(client);

    for (const cohort of COHORTS) {
      const { cloIds, ratioIds } = await seedOutcomesForYear(client, {
        year: cohort.year,
        mainOutcomeIds,
      });
      const { sections } = await seedOffering(client, cohort);
      const enrolled = await seedCohort(client, cohort, sections);

      for (const [index, section] of sections.entries()) {
        const students = enrolled[index];

        await seedAssessment(client, {
          section,
          students,
          cloIds,
          ratioIds,
          year: cohort.year,
        });

        // After the assessment, because week 1's attachment needs the
        // activity to exist. Both years: the plan is Section-bound, and the
        // prior year's sections need their own for the grain to be visible.
        await seedTeachingPlan(client, {
          section,
          year: cohort.year,
          performedBy: byAlias(section.teacher),
        });

        // Groups are for the current year only. The prior year is there to be
        // compared against, and its groups would be history nobody reads.
        if (cohort.year !== CURRENT_YEAR) continue;

        await seedWorkGroups(client, {
          section,
          students,
          performedBy: byAlias('U_TEACH'),
        });
      }
    }

    counts = await summarise(client);
    await client.query('COMMIT');
    client.release();
  } catch (error) {
    // The same shape, and for the same reason, as migrate.js: a failure can
    // take the connection with it, and then the rollback fails too. Swallow
    // that one - the transaction is already gone, and the failure worth
    // reporting is the seed's, not the cleanup's.
    try {
      await client.query('ROLLBACK');
    } catch {
      // fall through
    }
    // Released with the error, so pg discards the client rather than handing
    // the next caller a connection sitting in an aborted transaction.
    client.release(error);
    throw error;
  } finally {
    await pool.end();
  }

  return { schema: target, counts };
}

module.exports = {
  seed,
  byAlias,
  PASSWORD,
  ACCOUNTS,
  ROLES,
  PLOS,
  PLOS_INTL,
  RUBRICS,
  RUBRICS_INTL,
  CLOS,
  SCORE_RATIOS,
  ACTIVITIES,
  UNMARKED_ACTIVITY,
  unmarkedActivityName,
  unmarkedActivityDates,
  TEACHING_PLAN,
  PLAN_REFERENCED_ACTIVITY,
  planWeeksFor,
  COHORTS,
  MAX_GROUP_SIZE,
  UNGROUPED_TAIL,
  // The organisation, exported because #9's scope tests are about it: which
  // faculty a department hangs off and which department a programme hangs off
  // is what decides who reaches what, and a test that spelled the codes out
  // again would be asserting against its own copy.
  FACULTY,
  DEPARTMENTS,
  PROGRAMS,
  SUBJECT,
  PROGRAM,
  PROGRAM_INTL,
  CURRENT_YEAR,
  PRIOR_YEAR,
  SEMESTER,
};

if (require.main === module) {
  seed()
    .then(({ schema, counts }) => {
      console.log(`Schema "${schema}" now holds:`);
      console.log(`  ${counts.accounts} accounts, one per row of docs/04 §1.2`);
      console.log(`  ${counts.students} students across ${counts.sections} sections`);
      console.log(`  ${counts.activities} activities and ${counts.marks} marks`);
      console.log(`  ${counts.plan_weeks} teaching-plan weeks`);
      console.log(`  ${counts.groups} work groups holding ${counts.group_members} students`);
      console.log(`\nEvery account signs in with the password documented in README.md.`);
    })
    .catch((error) => {
      console.error(`Seed failed: ${error.message}`);
      process.exitCode = 1;
    });
}
