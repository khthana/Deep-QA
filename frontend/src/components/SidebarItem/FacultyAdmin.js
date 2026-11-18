import {
  HiOutlineSquaresPlus, // ข้อมูลหลัก
  HiOutlineBuildingOffice2, // ข้อมูลภาควิชา
  HiOutlineUsers, // ข้อมูลผู้ใช้งาน
  HiOutlineClock, // ประวัติการใช้งาน
} from 'react-icons/hi2'

// ข้อมูลหลักสูตร was in the ข้อมูลหลัก group until #282 (18 พ.ย. 2569): the owner
// took programmes off the Faculty Admin, who keeps departments and accounts.
// The group stays, with its one entry, so the menu keeps the shape it had.
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
