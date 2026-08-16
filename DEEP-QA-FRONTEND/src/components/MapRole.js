const roleMap = {
  DEPT_ADMIN: 'ผู้ดูแลระบบระดับภาควิชา',
  FACULTY_ADMIN: 'ผู้ดูแลระบบระดับคณะ',
  FULL_ADMIN: 'ผู้ดูแลระบบกลาง',
  GUEST: 'บุคคลทั่วไป',
  PROG_MANAGER: 'กรรมการหลักสูตร',
  STUDENT: 'นักศึกษา',
  TEACHER: 'อาจารย์',
}

/**
 * แปลง Role Code <-> Display Name
 * @param {string} value - Role Code เช่น "DEPT_ADMIN" หรือ Display Name เช่น "นักศึกษา"
 * @returns {string|null} ชื่อที่ถูกแปลง หรือ null ถ้าไม่พบ
 */

export function mapRole(value) {
  if (roleMap[value]) {
    return roleMap[value]
  }

  const foundKey = Object.keys(roleMap).find(key => roleMap[key] === value)
  return foundKey || null
}

export default roleMap
