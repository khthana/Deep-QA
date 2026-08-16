import { mapRole } from './MapRole'
function StatusTag({ role }) {
  const roleColors = {
    DEPT_ADMIN: {
      bg: 'bg-blue-100',
      text: 'text-secondary',
      dot: 'bg-blue-500',
    },
    FACULTY_ADMIN: {
      bg: 'bg-purple-100',
      text: 'text-purple-800',
      dot: 'bg-purple-500',
    },
    FULL_ADMIN: {
      bg: 'bg-indigo-100',
      text: 'text-indigo-800',
      dot: 'bg-indigo-500',
    },
    GUEST: { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-500' },
    PROG_MANAGER: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      dot: 'bg-yellow-500',
    },
    STUDENT: {
      bg: 'bg-pink-100',
      text: 'text-pink-800',
      dot: 'bg-pink-500',
    },
    TEACHER: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      dot: 'bg-green-500',
    },
  }

  const colors = roleColors[role] || {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    dot: 'bg-gray-500',
  }

  return (
    <span
      className={`inline-flex w-auto flex-nowrap items-center justify-center rounded-full px-2.5 py-0.5 text-sm font-medium ${colors.bg} ${colors.text}`}
    >
      {/* <span className={`w-2 h-2 me-1 rounded-full ${colors.dot}`}></span> */}
      {mapRole(role)}
    </span>
  )
}

export default StatusTag
