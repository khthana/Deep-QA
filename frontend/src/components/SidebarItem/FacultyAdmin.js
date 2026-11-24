import {
  HiOutlineSquaresPlus, // ข้อมูลหลัก
  HiOutlineBuildingOffice2, // ข้อมูลภาควิชา
  HiOutlineUsers, // ข้อมูลผู้ใช้งาน
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
  // No ประวัติการใช้งาน entry since #305 (docs/users-screen.md rule 11, the
  // owner's answer of 22 November 2569): the history is reached by the
  // แสดงประวัติการใช้งาน button on ข้อมูลผู้ใช้งาน, as the delivered menu had it.
]
