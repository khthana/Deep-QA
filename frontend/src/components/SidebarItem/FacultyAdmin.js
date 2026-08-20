import {
  HiOutlineSquaresPlus, // ข้อมูลหลัก
  HiOutlineBuildingOffice2, // ข้อมูลภาควิชา
  HiOutlineAcademicCap, // ข้อมูลหลักสูตร
  HiOutlineClipboardDocumentCheck, // ข้อมูล Rubric กลาง
  HiOutlineSquare3Stack3D, // หลักสูตร
  HiOutlineRectangleGroup, // รายวิชาในหลักสูตร
  HiOutlineIdentification, // ข้อมูลนักศึกษากลาง
  HiOutlineChartBar, // ผลการเรียนรู้
  HiOutlineKey, // กำหนดผลการเรียนรู้ระดับหลักสูตร PLO
  HiOutlineLink, // Maping ผลการเรียนรู้กับรายวิชา
  HiOutlineUsers, // ผู้ใช้งานระบบ
  HiOutlineClock, // ประวัติการใช้งาน
} from 'react-icons/hi2'

export const FACULTY_ADMIN = [
  {
    key: 'ข้อมูลหลัก',
    label: 'ข้อมูลหลัก',
    icon: <HiOutlineSquaresPlus />,
    sub: [
      {
        key: 'ข้อมูลภาควิชา',
        label: 'ข้อมูลภาควิชา',
        path: '/main/departments',
        icon: <HiOutlineBuildingOffice2 />,
      },
      {
        key: 'ข้อมูลหลักสูตร',
        label: 'ข้อมูลหลักสูตร',
        path: '/main/programs',
        icon: <HiOutlineAcademicCap />,
      },
      {
        key: 'ข้อมูล Rubric กลาง',
        label: 'ข้อมูล Rubric กลาง',
        path: '/main/rubrics',
        icon: <HiOutlineClipboardDocumentCheck />,
      },
    ],
  },
  {
    key: 'หลักสูตร',
    label: 'หลักสูตร',
    icon: <HiOutlineSquare3Stack3D />,
    sub: [
      {
        key: 'รายวิชาในหลักสูตร',
        label: 'รายวิชาในหลักสูตร',
        path: '/main/course-in-program',
        icon: <HiOutlineRectangleGroup />,
      },
      {
        key: 'ข้อมูลนักศึกษากลาง',
        label: 'ข้อมูลนักศึกษากลาง',
        path: '/main/student-data',
        icon: <HiOutlineIdentification />,
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
    key: 'ผู้ใช้งานระบบ',
    label: 'ผู้ใช้งานระบบ',
    path: '/main/users',
    icon: <HiOutlineUsers />,
  },
  {
    key: 'ประวัติการใช้งาน',
    label: 'ประวัติการใช้งาน',
    path: '/main/users/user-history',
    icon: <HiOutlineClock />,
  },
]
