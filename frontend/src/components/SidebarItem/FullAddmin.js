import {
  HiOutlineUserGroup, // ข้อมูลผู้ใช้งาน
  HiOutlineClock, // ประวัติการใช้งาน
} from 'react-icons/hi2'

export const FULL_ADMIN = [
  {
    key: 'ข้อมูลผู้ใช้งาน',
    label: 'ข้อมูลผู้ใช้งาน',
    path: '/main/users',
    icon: <HiOutlineUserGroup />,
  },
  // No department entry, and no route either. CONTEXT.md gives departments to
  // the Faculty Admin as the only role that may manage them; the Central Admin
  // "manages user accounts and permission grants system-wide, and nothing
  // else". The server refuses them on all seven of #14's endpoints, so a menu
  // item would only lead to a screen that answers 403.
  {
    key: 'ประวัติการใช้งาน',
    label: 'ประวัติการใช้งาน',
    path: '/main/users/user-history',
    icon: <HiOutlineClock />,
  },
]
