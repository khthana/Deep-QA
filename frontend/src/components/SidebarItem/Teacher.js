import {
  HiOutlineBookOpen, // รายวิชา
  HiOutlineDocumentText, // ข้อมูลรายวิชา
  HiOutlineUserGroup, // รายชื่อนักศึกษาของรายวิชา
  HiOutlineIdentification, // กลุ่มงานนักศึกษา
  HiOutlineChartBar, // ผลการเรียนรู้รายวิชา
  HiOutlineScale, // สัดส่วนคะแนน
  HiOutlinePencilSquare, // กิจกรรมการเรียนรู้ในรายวิชา
  HiOutlineMap, // แผนการสอน
  HiOutlineStar, // คะแนนกิจกรรมการเรียนรู้
  HiOutlinePresentationChartLine, // ผลลัพธ์การเรียนรู้รายวิชา
  HiOutlineUserCircle, // ผลลัพธ์การเรียนรู้รายบุคคล
  HiOutlineDocumentMagnifyingGlass, // รายละเอียดผลการเรียนรู้
  HiOutlineLink, // ความเชื่อมโยงผลการเรียนรู้และกิจกรรม
  HiOutlineShieldCheck, // การประเมินผลการเรียนรู้
  HiOutlineArrowPath, // การปรับปรุงอย่างต่อเนื่อง
} from 'react-icons/hi2'

/**
 * The placeholder every Section-specific entry carries, replaced with the
 * `section_id` the route is holding - ADR-0004.
 *
 * It was `%SUBJECT%` and was replaced with `{subject_name_en}-Section-{n}`,
 * read out of `localStorage`. That string names two different Sections the
 * moment a subject is taught in two years, which is the ordinary case rather
 * than an unlucky one, and the copy in `localStorage` was a second answer to
 * "which Section" that won silently whenever it disagreed with the address.
 */
export const SECTION_TOKEN = '%SECTION%'

export const TEACHER = [
  {
    key: 'รายวิชา',
    label: 'รายวิชา',
    path: '/teacher/teacherDashboard',
    icon: <HiOutlineBookOpen />,
  },
  {
    key: 'ข้อมูลรายวิชา',
    label: 'ข้อมูลรายวิชา',
    icon: <HiOutlineDocumentText />,
    sub: [
      {
        key: 'รายชื่อนักศึกษาของรายวิชา',
        label: 'รายชื่อนักศึกษาของรายวิชา',
        path: '/teacher/teacherDashboard/%SECTION%/subjectStudents',
        icon: <HiOutlineUserGroup />,
      },
      {
        key: 'กลุ่มงานนักศึกษา',
        label: 'กลุ่มงานนักศึกษา',
        path: '/teacher/teacherDashboard/%SECTION%/studentGroups',
        icon: <HiOutlineIdentification />,
      },
      {
        key: 'ผลการเรียนรู้รายวิชา',
        label: 'ผลการเรียนรู้รายวิชา',
        path: '/teacher/teacherDashboard/%SECTION%/courseOutcomes',
        icon: <HiOutlineChartBar />,
      },
      {
        key: 'สัดส่วนคะแนน',
        label: 'สัดส่วนคะแนน',
        path: '/teacher/teacherDashboard/%SECTION%/gradingWeights',
        icon: <HiOutlineScale />,
      },
      {
        key: 'กิจกรรมการเรียนรู้ในรายวิชา',
        label: 'กิจกรรมการเรียนรู้ในรายวิชา',
        path: '/teacher/teacherDashboard/%SECTION%/learningActivities',
        icon: <HiOutlinePencilSquare />,
      },
      {
        key: 'แผนการสอน',
        label: 'แผนการสอน',
        path: '/teacher/teacherDashboard/%SECTION%/teachingPlan',
        icon: <HiOutlineMap />,
      },
      {
        key: 'คะแนนกิจกรรมการเรียนรู้',
        label: 'คะแนนกิจกรรมการเรียนรู้',
        path: '/teacher/teacherDashboard/%SECTION%/activityScores',
        icon: <HiOutlineStar />,
      },
      {
        key: 'ผลลัพธ์การเรียนรู้รายวิชา',
        label: 'ผลลัพธ์การเรียนรู้รายวิชา',
        path: '/teacher/teacherDashboard/%SECTION%/courseResults',
        icon: <HiOutlinePresentationChartLine />,
      },
      {
        key: 'ผลลัพธ์การเรียนรู้รายบุคคล',
        label: 'ผลลัพธ์การเรียนรู้รายบุคคล',
        path: '/teacher/teacherDashboard/%SECTION%/studentResults',
        icon: <HiOutlineUserCircle />,
      },
      {
        key: 'รายละเอียดผลการเรียนรู้',
        label: 'รายละเอียดผลการเรียนรู้',
        path: '/teacher/teacherDashboard/%SECTION%/learningDetails',
        icon: <HiOutlineDocumentMagnifyingGlass />,
      },
      {
        key: 'ความเชื่อมโยงผลการเรียนรู้และกิจกรรม',
        label: 'ความเชื่อมโยงผลการเรียนรู้และกิจกรรม',
        path: '/teacher/teacherDashboard/%SECTION%/outcomeActivityMapping',
        icon: <HiOutlineLink />,
      },
      {
        key: 'การประเมินผลการเรียนรู้',
        label: 'การประเมินผลการเรียนรู้',
        path: '/teacher/teacherDashboard/%SECTION%/AssessmentCLO',
        icon: <HiOutlineShieldCheck />,
      },
      {
        key: 'การปรับปรุงอย่างต่อเนื่อง',
        label: 'การปรับปรุงอย่างต่อเนื่อง',
        path: '/teacher/teacherDashboard/%SECTION%/ContinuousImprove',
        icon: <HiOutlineArrowPath />,
      },
    ],
  },
]
