import {
  HiOutlineSquaresPlus, // ข้อมูลหลัก
  HiOutlineBuildingOffice2, // ข้อมูลภาควิชา
  HiOutlineAcademicCap, // ข้อมูลหลักสูตร
  HiOutlineUsers, // ข้อมูลผู้ใช้งาน
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
