import {
  HiOutlineClipboardDocumentCheck, // ข้อมูล Rubric กลาง
  HiOutlineAcademicCap, // หลักสูตร
  HiOutlineSquare3Stack3D, // รายวิชาในหลักสูตร
  HiOutlineCalendarDays, // การเปิดรายวิชาในภาคการศึกษา
  HiOutlineChartBar, // ผลการเรียนรู้
  HiOutlineKey, // กำหนดผลการเรียนรู้ระดับหลักสูตร PLO
  HiOutlineLink, // Maping ผลการเรียนรู้กับรายวิชา
  HiOutlinePresentationChartLine, // การประเมินผลการเรียนรู้
  HiOutlineUsers, // ระดับหลักสูตรตามรุ่นปีรับเข้า
  HiOutlineArrowsRightLeft, // เปรียบเทียบระดับหลักสูตร
  HiOutlineUserCircle, // ระดับหลักสูตรรายคน
  HiOutlineUserGroup, // ระดับหลักสูตรของนักศึกษาทุกคน
} from 'react-icons/hi2'

export const PROG_MANAGER = [
  {
    key: 'ข้อมูล Rubric กลาง',
    label: 'ข้อมูล Rubric กลาง',
    path: '/main/rubrics',
    icon: <HiOutlineClipboardDocumentCheck />,
  },
  {
    key: 'หลักสูตร',
    label: 'หลักสูตร',
    icon: <HiOutlineAcademicCap />,
    sub: [
      {
        key: 'รายวิชาในหลักสูตร',
        label: 'รายวิชาในหลักสูตร',
        path: '/main/course-in-program',
        icon: <HiOutlineSquare3Stack3D />,
      },
      {
        key: 'การเปิดรายวิชาในภาคการศึกษา',
        label: 'การเปิดรายวิชาในภาคการศึกษา',
        path: '/main/course-in-term',
        icon: <HiOutlineCalendarDays />,
      },
    ],
  },
  {
    key: 'ผลการเรียนรู้',
    label: 'ผลการเรียนรู้',
    icon: <HiOutlineChartBar />,
    sub: [
      {
        key: 'กำหนดผลการเรียนรู้ระดับหลักสูตร PLO',
        label: 'กำหนดผลการเรียนรู้ระดับหลักสูตร PLO',
        path: '/main/plos',
        icon: <HiOutlineKey />,
      },
      {
        key: 'Maping ผลการเรียนรู้กับรายวิชา',
        label: 'การเชื่อมโยงผลการเรียนรู้กับรายวิชา',
        path: '/main/mapping-plo',
        icon: <HiOutlineLink />,
      },
    ],
  },
  {
    key: 'การประเมินผลการเรียนรู้',
    label: 'การประเมินผลการเรียนรู้',
    icon: <HiOutlinePresentationChartLine />,
    sub: [
      {
        key: 'ระดับหลักสูตรตามรุ่นปีรับเข้า',
        label: 'ระดับหลักสูตรตามรุ่นปีรับเข้า',
        path: '/main/programLevelByIntake',
        icon: <HiOutlineUsers />,
      },
      {
        key: 'เปรียบเทียบระดับหลักสูตร',
        label: 'เปรียบเทียบระดับหลักสูตร',
        path: '/main/programLevelCompare',
        icon: <HiOutlineArrowsRightLeft />,
      },
      {
        key: 'ระดับหลักสูตรรายคน',
        label: 'ระดับหลักสูตรรายคน',
        path: '/main/programLevelIndividual',
        icon: <HiOutlineUserCircle />,
      },
      {
        key: 'ระดับหลักสูตรของนักศึกษาทุกคน',
        label: 'ระดับหลักสูตรของนักศึกษาทุกคน',
        path: '/main/programLevelAllStudents',
        icon: <HiOutlineUserGroup />,
      },
    ],
  },
]
