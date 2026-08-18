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
        path: '/teacher/teacherDashboard/%SUBJECT%/subjectStudents',
        icon: <HiOutlineUserGroup />,
      },
      {
        key: 'กลุ่มงานนักศึกษา',
        label: 'กลุ่มงานนักศึกษา',
        path: '/teacher/teacherDashboard/%SUBJECT%/studentGroups',
        icon: <HiOutlineIdentification />,
      },
      {
        key: 'ผลการเรียนรู้รายวิชา',
        label: 'ผลการเรียนรู้รายวิชา',
        path: '/teacher/teacherDashboard/%SUBJECT%/courseOutcomes',
        icon: <HiOutlineChartBar />,
      },
      {
        key: 'สัดส่วนคะแนน',
        label: 'สัดส่วนคะแนน',
        path: '/teacher/teacherDashboard/%SUBJECT%/gradingWeights',
        icon: <HiOutlineScale />,
      },
      {
        key: 'กิจกรรมการเรียนรู้ในรายวิชา',
        label: 'กิจกรรมการเรียนรู้ในรายวิชา',
        path: '/teacher/teacherDashboard/%SUBJECT%/learningActivities',
        icon: <HiOutlinePencilSquare />,
      },
      {
        key: 'แผนการสอน',
        label: 'แผนการสอน',
        path: '/teacher/teacherDashboard/%SUBJECT%/teachingPlan',
        icon: <HiOutlineMap />,
      },
      {
        key: 'คะแนนกิจกรรมการเรียนรู้',
        label: 'คะแนนกิจกรรมการเรียนรู้',
        path: '/teacher/teacherDashboard/%SUBJECT%/activityScores',
        icon: <HiOutlineStar />,
      },
      {
        key: 'ผลลัพธ์การเรียนรู้รายวิชา',
        label: 'ผลลัพธ์การเรียนรู้รายวิชา',
        path: '/teacher/teacherDashboard/%SUBJECT%/courseResults',
        icon: <HiOutlinePresentationChartLine />,
      },
      {
        key: 'ผลลัพธ์การเรียนรู้รายบุคคล',
        label: 'ผลลัพธ์การเรียนรู้รายบุคคล',
        path: '/teacher/teacherDashboard/%SUBJECT%/studentResults',
        icon: <HiOutlineUserCircle />,
      },
      {
        key: 'รายละเอียดผลการเรียนรู้',
        label: 'รายละเอียดผลการเรียนรู้',
        path: '/teacher/teacherDashboard/%SUBJECT%/learningDetails',
        icon: <HiOutlineDocumentMagnifyingGlass />,
      },
      {
        key: 'ความเชื่อมโยงผลการเรียนรู้และกิจกรรม',
        label: 'ความเชื่อมโยงผลการเรียนรู้และกิจกรรม',
        path: '/teacher/teacherDashboard/%SUBJECT%/outcomeActivityMapping',
        icon: <HiOutlineLink />,
      },
      {
        key: 'การประเมินผลการเรียนรู้',
        label: 'การประเมินผลการเรียนรู้',
        path: '/teacher/teacherDashboard/%SUBJECT%/AssessmentCLO',
        icon: <HiOutlineShieldCheck />,
      },
      {
        key: 'การปรับปรุงอย่างต่อเนื่อง',
        label: 'การปรับปรุงอย่างต่อเนื่อง',
        path: '/teacher/teacherDashboard/%SUBJECT%/ContinuousImprove',
        icon: <HiOutlineArrowPath />,
      },
    ],
  },
]
