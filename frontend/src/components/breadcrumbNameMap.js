/**
 * A word in an address, as a sentence a person reads — one entry per word.
 *
 * Keyed on the segment alone, which is enough for every word but one that the
 * addresses in `AppRoutes.js` end with. The exception is `criteria`, and
 * `breadcrumbNameByParent` below is where the other screen is named.
 */
export const breadcrumbNameMap = {
  main: 'หน้าหลัก',
  departments: 'ข้อมูลภาควิชา',
  programs: 'ข้อมูลหลักสูตร',
  users: 'ข้อมูลผู้ใช้งาน',
  'edit-user': 'แก้ไขข้อมูลผู้ใช้งาน',
  subjects: 'ข้อมูลรายวิชา',
  rubrics: 'ข้อมูล Rubric กลาง',
  'edit-rubric': 'แก้ไขข้อมูล Rubric',
  criteria: 'เกณฑ์การให้คะแนนของ Rubric',
  'course-in-program': 'รายวิชาในหลักสูตร',
  'student-data': 'ข้อมูลนักศึกษากลาง',
  plos: 'การกำหนดผลการเรียนรู้ระดับหลักสูตร PLO',
  teacher: 'ข้อมูลหลัก',
  'mapping-plo': 'การเชื่อมโยงผลการเรียนรู้กับรายวิชา',
  teacherDashboard: 'รายวิชาที่รับผิดชอบ',
  subjectStudents: 'รายชื่อนักศึกษาของรายวิชา',
  studentGroups: 'กลุ่มงานนักศึกษา',
  courseOutcomes: 'ผลการเรียนรู้รายวิชา',
  gradingWeights: 'สัดส่วนคะแนน',
  learningActivities: 'กิจกรรมการเรียนรู้ในรายวิชา',
  teachingPlan: 'แผนการสอน',
  activityScores: 'คะแนนกิจกรรมการเรียนรู้',
  courseResults: 'ผลลัพธ์การเรียนรู้รายวิชา',
  studentResults: 'ผลลัพธ์การเรียนรู้รายบุคคล',
  learningDetails: 'รายละเอียดผลการเรียนรู้',
  outcomeActivityMapping: 'ความเชื่อมโยงผลการเรียนรู้และกิจกรรม',
  'user-history': 'ประวัติการใช้งาน',
  'course-in-term': 'การเปิดรายวิชาในภาคการศึกษา',
  behaviors: 'พฤติกรรมที่วัดผลได้ตาม CLO',
  attention: 'ระดับการบรรลุผลพฤติกรรม',
  AddNewActivity: 'เพิ่มกิจกรรมใหม่',
  AssessmentCLO: 'การประเมินผลการเรียนรู้',
  AssessmentCriteria: 'หลักฐานการประเมิน',
  evidence: 'หลักฐานการประเมิน',
  ContinuousImprove: 'การปรับปรุงอย่างต่อเนื่อง',
  programLevelByIntake: 'ผลการเรียนรู้ระดับหลักสูตรตามปีรับเข้า',
  programLevelIndividual: 'ผลการเรียนรู้ระดับหลักสูตรรายบุคคล',
  programLevelCompare: 'เปรียบเทียบผลการเรียนรู้ระดับหลักสูตร',
  programLevelAllStudents: 'ผลลัพธ์การเรียนรู้ระดับหลักสูตร',
}

/**
 * The sentence for a crumb whose own word does not say which screen — #189.
 *
 * `criteria` is the last segment of two of this router's addresses —
 * `/main/rubrics/:rubricId/criteria` (#22) and
 * `.../courseOutcomes/:cloId/criteria` (#29) — and the map above holds one
 * sentence per word, so its entry named one of the two screens and named the
 * Rubric's. The CLO's screen then drew the Rubric's sentence under its own
 * heading. It is the only word this happens to: measured on 4 October 2569,
 * of the 34 words the router's 35 addresses end with, no other is shared.
 *
 * The owner's answer on 4 October 2569 was that the trail follows the screen,
 * which is the same test #190 kept the word *Rubric* by and which points the
 * other way here: `AchievementCriteria.js` heads itself *เกณฑ์การบรรลุผลของ
 * CLO-1*, the link into it on `CourseOutcomes.js` reads *เกณฑ์การบรรลุผล*, and
 * `CONTEXT.md` glosses Achievement Criteria with that word. The Rubric's
 * sentence stays where it is, because that screen's own heading writes it.
 *
 * The key is `<the nearest word above>/<the word>`, resolved in
 * `wordCrumbLabel`. It is not a count of segments: `rubrics` and
 * `courseOutcomes` both sit two crumbs up today only because an id sits
 * between, so *two up* would be a claim about that shape rather than about
 * what names a screen.
 */
export const breadcrumbNameByParent = {
  'courseOutcomes/criteria': 'เกณฑ์การบรรลุผล',
}
