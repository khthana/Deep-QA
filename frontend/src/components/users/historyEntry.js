/**
 * One activity log entry, as a person reads it - #13, moved here by #305.
 *
 * These were `components/users/HistoryPanel.js`'s, the panel that drew one
 * account's history. #305 (`docs/users-screen.md` rule 11, the owner's answer
 * of 22 November 2569) gave the history page back its delivered table of every
 * account's entries and retired the panel, so what it knew about an entry lives
 * here, line for line, and the mutants that quoted those lines moved with them.
 */

/**
 * The codes `user_log.activity` holds, as a person reads them.
 *
 * Written where the actions are: `recordActivity` is called by the sign-in,
 * account, grant and profile routes, and by the four master-data screens since
 * #58, and these are the codes they write. An unrecognised one falls through to
 * the code itself rather than to a blank, because a new activity nobody added a
 * label for should still be visible in an audit rather than silently absent.
 *
 * `user_log.activity` is `varchar(20)`, which is why the pair of verbs an
 * account's status takes shares one code and why nothing here is longer than
 * `IMPORT_DEPARTMENTS`. A department has no deactivation of its own because it
 * has no status route: switching one off is an edit on its form, and #14's
 * removal refuses rather than deactivating. A programme and a subject do,
 * because their removal deactivates when something depends on the record, and a
 * line saying *deleted* would then be false.
 */
export const ACTIONS = {
  LOGIN: 'เข้าสู่ระบบ',
  GOOGLE_LOGIN: 'เข้าสู่ระบบด้วย Google',
  LOGOUT: 'ออกจากระบบ',
  SWITCH_ROLE: 'สลับบทบาทที่ใช้งาน',
  CHANGE_PASSWORD: 'เปลี่ยนรหัสผ่าน',
  CREATE_USER: 'เพิ่มบัญชีผู้ใช้',
  UPDATE_USER: 'แก้ไขข้อมูลผู้ใช้',
  SET_USER_STATUS: 'เปลี่ยนสถานะบัญชี',
  IMPORT_USERS: 'นำเข้าบัญชีผู้ใช้',
  GRANT_ROLE: 'ให้บทบาท',
  REVOKE_ROLE: 'ยกเลิกบทบาท',
  CREATE_DEPARTMENT: 'เพิ่มภาควิชา',
  UPDATE_DEPARTMENT: 'แก้ไขภาควิชา',
  DELETE_DEPARTMENT: 'ลบภาควิชา',
  IMPORT_DEPARTMENTS: 'นำเข้าภาควิชา',
  CREATE_PROGRAM: 'เพิ่มหลักสูตร',
  UPDATE_PROGRAM: 'แก้ไขหลักสูตร',
  DELETE_PROGRAM: 'ลบหลักสูตร',
  DEACTIVATE_PROGRAM: 'ปิดการใช้งานหลักสูตร',
  IMPORT_PROGRAMS: 'นำเข้าหลักสูตร',
  CREATE_SUBJECT: 'เพิ่มรายวิชา',
  UPDATE_SUBJECT: 'แก้ไขรายวิชา',
  DELETE_SUBJECT: 'ลบรายวิชา',
  DEACTIVATE_SUBJECT: 'ปิดการใช้งานรายวิชา',
  IMPORT_SUBJECTS: 'นำเข้ารายวิชา',
  CREATE_STUDENT: 'เพิ่มนักศึกษา',
  IMPORT_STUDENTS: 'นำเข้านักศึกษา',
}

/**
 * The badge an activity is drawn in - #305, rule 11's *ป้ายสี*.
 *
 * The delivered table (`userLogs.js`) coloured eight codes, five of which this
 * system writes under the same meaning: the colours below are those, copied.
 * Its `UPDATE_PROFILE` colour went to `UPDATE_USER`, the edit an account takes,
 * and its `INACTIVE` colour to `SET_USER_STATUS`, which is both of its
 * `ACTIVE`/`INACTIVE` in one code (`varchar(20)`, above) and is mostly a
 * suspension. Every other code is drawn in the delivered table's own fallback,
 * `BADGE_OTHERWISE` - the implementer's choice, written on the sheet, because
 * nineteen more colours would be nineteen decisions nobody asked for.
 */
const BADGES = {
  LOGIN: 'bg-emerald-100 text-emerald-700',
  GOOGLE_LOGIN: 'bg-sky-100 text-sky-700',
  LOGOUT: 'bg-zinc-100 text-zinc-600',
  CHANGE_PASSWORD: 'bg-fuchsia-100 text-fuchsia-700',
  UPDATE_USER: 'bg-indigo-100 text-indigo-700',
  SET_USER_STATUS: 'bg-orange-100 text-orange-700',
}

const BADGE_OTHERWISE = 'bg-slate-100 text-slate-600'

export const activityOf = entry => ACTIONS[entry.activity] ?? entry.activity

export const badgeOf = entry => BADGES[entry.activity] ?? BADGE_OTHERWISE

/**
 * The record the line was written about, as a person reads it.
 *
 * `target_kind` is the sort of record and `target_id` is its own id, and the
 * id is shown raw. Resolving it to a name would mean reading a record the
 * reader may not reach - an administrator reaches the person who acted without
 * necessarily reaching everything that person touched - so a name here would
 * be a disclosure the rest of the screens refuse. The roles panel shows
 * `assigned_by` the same way.
 *
 * Blank for the actions whose only object is the actor's own account, which is
 * what migration 0006 leaves null: signing in and out, switching role, and
 * changing one's own password. An import was on that list until #58 and is not
 * any more - it writes a line per row, each naming the record it wrote, so a
 * twelve-row upload reads as twelve named lines sharing one timestamp.
 */
const TARGETS = {
  USER: 'บัญชีผู้ใช้',
  DEPARTMENT: 'ภาควิชา',
  PROGRAM: 'หลักสูตร',
  SUBJECT: 'รายวิชา',
  STUDENT: 'นักศึกษา',
}

/**
 * The record an entry is about - #294.
 *
 * A department or a programme is read by its name, which the server resolves
 * (`backend/routes/history.js` §`TARGET_NAME`), written straight after its
 * kind word the way Thai writes `หลักสูตรวิศวกรรมคอมพิวเตอร์`. The owner
 * answered on 20 November 2569 that a unit deleted since keeps its code, which
 * is then the only thing left that says what it was; an account, a subject and
 * a student keep their codes everywhere (#294 rule 1), and the server sends no
 * name for them.
 */
export const actedOn = entry => {
  if (!entry.target_id) return '—'
  const kind = TARGETS[entry.target_kind] ?? entry.target_kind
  return entry.target_name ? `${kind}${entry.target_name}` : `${kind} ${entry.target_id}`
}

/**
 * When it happened, in Bangkok time, as the delivered table's two columns
 * wrote it: วันที่ `24 พ.ย. 2569` and เวลา `เวลา 14:05 น.` (#305).
 *
 * The second criterion of #13 says "the time in the Bangkok timezone", and the
 * zone is named rather than left to the browser. The server sends the instant,
 * so without this the same log line reads as a different hour on a laptop whose
 * clock is set abroad - which for an audit record is the one thing it may not
 * do. The delivered table left it to the browser; the zone is #13's and is
 * kept. One object for both columns, so the two cannot disagree about the day.
 */
const IN_BANGKOK = { timeZone: 'Asia/Bangkok' }

export const dayOf = value =>
  value
    ? new Date(value).toLocaleDateString('th-TH', {
        ...IN_BANGKOK,
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—'

export const timeOf = value =>
  value
    ? `เวลา ${new Date(value).toLocaleTimeString('th-TH', {
        ...IN_BANGKOK,
        hour: '2-digit',
        minute: '2-digit',
      })} น.`
    : '—'
