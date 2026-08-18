import {
  HiOutlineUserGroup, // ผู้ใช้งานระบบ
  HiOutlineClock, // ประวัติการใช้งาน
  HiOutlineBuildingOffice2, // ข้อมูลภาควิชา
} from 'react-icons/hi2'

export const FULL_ADMIN = [
  {
    key: 'ผู้ใช้งานระบบ',
    label: 'ผู้ใช้งานระบบ',
    path: '/main/users',
    icon: <HiOutlineUserGroup />,
  },
  // #14 opens the department screen to the Central Admin as well as to the
  // faculty administrator - `FACULTY_ROLES` on the server is both - and an
  // endpoint a role may reach with no way to reach it is the worst of the
  // three states. The faculty is a field on the form for them, because acting
  // globally is not acting in a faculty.
  {
    key: 'ข้อมูลภาควิชา',
    label: 'ข้อมูลภาควิชา',
    path: '/main/departments',
    icon: <HiOutlineBuildingOffice2 />,
  },
  {
    key: 'ประวัติการใช้งาน',
    label: 'ประวัติการใช้งาน',
    path: '/main/users/user-history',
    icon: <HiOutlineClock />,
  },
]
