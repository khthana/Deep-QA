/**
 * Role code to the Thai name shown on screen.
 *
 * The six codes are the six roles in CONTEXT.md and no others. The inherited
 * map carried STUDENT and GUEST as well; neither is a role in this system -
 * students are records, not accounts, and a guest is a caller who has not
 * signed in - and both are dropped rather than carried into a menu.
 *
 * EXT_ASSESSOR was missing from the inherited map, so an external assessor's
 * own role name came out null on their screen. It is here.
 */
const roleMap = {
  FULL_ADMIN: 'ผู้ดูแลระบบกลาง',
  FACULTY_ADMIN: 'ผู้ดูแลระบบระดับคณะ',
  DEPT_ADMIN: 'ผู้ดูแลระบบระดับภาควิชา',
  PROG_MANAGER: 'กรรมการหลักสูตร',
  TEACHER: 'อาจารย์ผู้สอน',
  EXT_ASSESSOR: 'ผู้ประเมินภายนอก',
}

/** The display name for a role code, or the code itself if it is unknown. */
export function roleName(roleId) {
  return roleMap[roleId] ?? roleId
}

export default roleMap
