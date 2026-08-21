import {
  HiOutlineCube, // ข้อมูลหลัก
  HiOutlineAcademicCap, // ข้อมูลหลักสูตร
  HiOutlineBookOpen, // ข้อมูลรายวิชา
  HiOutlineClipboardDocumentCheck, // ข้อมูล Rubric กลาง
  HiOutlineSquare3Stack3D, // หลักสูตร
  HiOutlineRectangleGroup, // รายวิชาในหลักสูตร
  HiOutlineIdentification, // ข้อมูลนักศึกษากลาง
  HiOutlineChartBar, // ผลการเรียนรู้
  HiOutlineKey, // กำหนดผลการเรียนรู้ระดับหลักสูตร PLO
  HiOutlineLink, // Maping ผลการเรียนรู้กับรายวิชา
  HiOutlineUsers, // ข้อมูลผู้ใช้งาน
  HiOutlineClock, // ประวัติการใช้งาน
} from 'react-icons/hi2'

export const DEPT_ADMIN = [
  {
    key: 'ข้อมูลหลัก',
    label: 'ข้อมูลหลัก',
    icon: <HiOutlineCube />,
    sub: [
      {
        key: 'ข้อมูลหลักสูตร',
        label: 'ข้อมูลหลักสูตร',
        path: '/main/programs',
        icon: <HiOutlineAcademicCap />,
      },
      {
        key: 'ข้อมูลรายวิชา',
        label: 'ข้อมูลรายวิชา',
        path: '/main/subjects',
        icon: <HiOutlineBookOpen />,
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
        label: 'การเชื่อมโยงผลการเรียนรู้กับรายวิชา', // รักษา label เดิมไว้
        path: '/main/mapping-plo',
        icon: <HiOutlineLink />,
      },
    ],
  },
  {
    key: 'ข้อมูลผู้ใช้งาน',
    label: 'ข้อมูลผู้ใช้งาน',
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
