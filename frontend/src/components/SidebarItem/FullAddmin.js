import {
  HiOutlineUserGroup, // ผู้ใช้งานระบบ
  HiOutlineClock, // ประวัติการใช้งาน
} from 'react-icons/hi2'

export const FULL_ADMIN = [
  {
    key: 'ผู้ใช้งานระบบ',
    label: 'ผู้ใช้งานระบบ',
    path: '/main/users',
    icon: <HiOutlineUserGroup />,
  },
  {
    key: 'ประวัติการใช้งาน',
    label: 'ประวัติการใช้งาน',
    path: '/main/users/user-history',
    icon: <HiOutlineClock />,
  },
]
