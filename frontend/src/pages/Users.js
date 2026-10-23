import { useCallback, useEffect, useRef, useState } from 'react'

import HistoryPanel from '../components/users/HistoryPanel'
import GrantsPanel from '../components/users/GrantsPanel'
import ConfirmDialog from '../components/ConfirmDialog'
import ImportPanel from '../components/ImportPanel'
import Notice from '../components/Notice'
import Pager from '../components/Pager'
import UserForm from '../components/users/UserForm'
import { personName } from '../components/users/personName'
import { scopeNamed } from '../components/users/scopeLabel'
import useGrantable from '../components/users/useGrantable'
import { roleName } from '../components/MapRole'
import { useAuth } from '../context/AuthContext'
import { useScreenGeneration } from '../context/ScreenGeneration'
import {
  createUser,
  importTemplate,
  importUsers,
  listUsers,
  setUserStatus,
  updateUser,
} from '../api/users'

/**
 * ข้อมูลผู้ใช้งาน — tickets #11, #12 and #13.
 *
 * Who exists, who may be added, whose account is switched off, for how long an
 * external assessor's account works, and - #12 - which roles each person holds
 * and at what scope. Reached by the Central Admin and by the
 * administrators below them, whose sidebars carry the entry (docs/05 A11) and
 * who now reach the route as well - #10 left it open to the Central Admin alone
 * because that was all that ticket needed, and #11's eighth criterion is what
 * settles it.
 *
 * Nothing on this screen decides what the person may see or do. The list
 * arrives already narrowed to the accounts their acting grant reaches, and
 * every write is refused server-side on the same rule; the screen draws what it
 * was given (ADR-0002). So a department administrator's page is short not
 * because it filtered, but because that is what the server sent.
 *
 * The paging is server-side, which is the difference between the criterion
 * being met and appearing to be: a screen that fetched every account and
 * sliced ten off the front would look identical and would still be sending the
 * whole university down the wire.
 */

const PAGE_SIZE = 10

/**
 * The rules the template's header cannot state - #124.
 *
 * The example row was taken out of `users-template.csv` because uploading the
 * file unchanged created an account, and this register has no route that can
 * remove one. The fifteen column *names* survive in the header; what went with
 * the row is everything about how to fill them, so it is said here instead,
 * where a person reads it before pressing download rather than after being
 * refused fifteen columns later.
 *
 * Each line was read off the code rather than remembered, in the order a bad
 * row meets the checks - but *the code* is wider than `readAccount`, and saying
 * otherwise would send the next reader to one function for seven answers.
 * `readAccount` holds the dates, the identifiers and the password; the role is
 * required by the import wrapper; the scope is `placeAllowed` and `assignable`
 * further down this file; and the status is enforced by the column simply not
 * being in `IMPORT_COLUMNS`, which is a rule no function states at all.
 *
 * Two of the seven are relations *between* columns rather than properties of
 * one, so a row of column names could not have carried them even in principle;
 * that is the sense in which a header could never have done this job, and it is
 * a narrower claim than the route comment's four (the kinds of thing the
 * deleted example row was teaching) or `11b`'s three (the notes that row
 * asserts). The name is an
 * either/or across two columns - the specification owner cut that clause from
 * the sentence on 9 September 2569, so what the screen says today is the
 * weaker true half, that either language is accepted, and `readAccount`'s
 * `invalidUser` for a row with neither is stated nowhere a person reads. And
 * the password is required for two role codes and *useless* for the rest:
 * nothing here refuses one, it is hashed and stored, and `accounts.js:275`
 * turns it away at sign-in - which is why the sentence says who signs in with
 * what rather than claiming a refusal this path does not make.
 *
 * `ค.ศ.` is stated in words because a Buddhist-era year is well-formed, is
 * accepted, and files the window five centuries out - measured while closing
 * this ticket and open as #125. Until that is decided, this sentence is the
 * only thing standing between a Thai form-filling habit and an account nobody
 * can sign in to or delete.
 */
const IMPORT_NOTES = [
  'user_id และ email ต้องมีทุกแถว (user_id ยาวไม่เกิน 20 ตัวอักษร email ไม่เกิน 100)',
  'ชื่อจริงกรอกเป็นภาษาไทยหรือภาษาอังกฤษก็ได้',
  'valid_from และ valid_until ใช้รูปแบบ ปี-เดือน-วัน เป็นปี ค.ศ. เช่น 2026-09-30 เว้นว่างได้ถ้าไม่จำกัดช่วงเวลา และวันเริ่มต้องไม่อยู่หลังวันสิ้นสุด',
  'role_id ต้องระบุทุกแถว และ scope_id คือรหัสภาควิชาหรือหลักสูตรที่บทบาทนั้นครอบคลุม',
  'password กรอกเฉพาะบทบาท FULL_ADMIN และ EXT_ASSESSOR บทบาทอื่นเข้าระบบผ่านบัญชี Google',
  'department_id และ program_id ต้องเป็นหน่วยงานที่ผู้นำเข้าเองมีสิทธิ์อยู่แล้ว',
  'สถานะบัญชีตั้งจากไฟล์ไม่ได้ ทุกแถวที่นำเข้าจะเปิดใช้งาน หากต้องการระงับให้ใช้ปุ่มบนรายการ',
]

const STATUS = {
  active: { label: 'ใช้งานอยู่', className: 'bg-green-100 text-green-800' },
  inactive: { label: 'ถูกระงับ', className: 'bg-gray-200 text-gray-700' },
}

const control =
  'rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'

/**
 * Why the suspend button on your own row is dead, said on the button - #84.
 *
 * A copy of `REFUSALS.selfStatus`, and it has to be one: create-react-app
 * refuses imports from outside `src/`, so no screen in this tree can read
 * `backend/auth/refusals`. The copy is not left to drift - `84a` row 1 asserts
 * this exact attribute equals that constant, so the two part company in a
 * failing test rather than in front of a person.
 *
 * The same words as the server's refusal on purpose. Somebody who reaches the
 * route another way - and ADR-0002 says they still can - reads one sentence,
 * not two accounts of one rule.
 */
const CANNOT_SUSPEND_SELF = 'ระงับบัญชีของตัวเองไม่ได้'

/**
 * The window as a person reads it, or a dash for an account that has none.
 *
 * A window open at one end is named rather than punctuated. The ellipsis this
 * replaced - `2026-08-10 ถึง …` - asked the reader to know what a missing end
 * meant, and `…` is also what a truncated cell looks like, so the one shape
 * that says "started, no end in sight" read like the data had failed to load.
 * Both open ends change together: leaving the other as `… ถึง Y` would put two
 * spellings of one idea in one column.
 */
/**
 * Which way this row's switch is pointing - the one place that reads it.
 *
 * Three things ask: the button's own verb, the question #86 restored, and the
 * write that answers it. They were the same expression written out three times
 * until review asked, and two copies of one opinion is a claim neither of them
 * can be shown to hold (#97).
 */
const suspends = user => user.status === 'active'

/**
 * What the question asks, in the direction the press is going - #86.
 *
 * The account is named by its code and then by its name, which is what the
 * press was aimed at: the table's first column is รหัสผู้ใช้, two people can
 * share a Thai name, and #86's whole point is that the box is what catches a
 * press on the wrong row of ten. That is the first of the five kinds #93 left
 * the code in - the sentence of a confirmation dialog - and
 * `frontend/scripts/label-codes.js` cannot see this one to say so, the name
 * arriving through `personName` rather than from a `user_name_th` column.
 *
 * The suspending direction says what it costs, because that is the asymmetry
 * the question exists for: a suspension is refused at the *next request* of a
 * session already open, not at the next sign-in - `sessionAdmission` in
 * `backend/auth/accounts.js`, and `11c` row 3 is the measurement. Reactivation
 * takes nothing away, so its sentence says nothing about consequences it does
 * not have.
 */
const asks = user =>
  suspends(user)
    ? `ต้องการระงับการใช้งานบัญชีของ ${user.user_id} ${personName(user)} ใช่หรือไม่ บัญชีที่ถูกระงับจะถูกปฏิเสธทุกคำขอตั้งแต่คำขอถัดไป แม้ผู้ใช้งานจะยังเปิดหน้าจอค้างอยู่`
    : `ต้องการเปิดใช้งานบัญชีของ ${user.user_id} ${personName(user)} ใช่หรือไม่`

const windowOf = user => {
  if (!user.valid_from && !user.valid_until) return '—'
  if (!user.valid_until) return `ตั้งแต่ ${user.valid_from}`
  if (!user.valid_from) return `ถึง ${user.valid_until}`
  return `${user.valid_from} ถึง ${user.valid_until}`
}

export default function Users() {
  const { profile } = useAuth()
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ q: '', role: '', status: '' })
  const [data, setData] = useState({ users: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [editing, setEditing] = useState(null)
  const [switching, setSwitching] = useState(null)
  /**
   * One flag for both writes, and that is a measurement rather than an
   * oversight - #142 asks every screen which holders can start while it is up.
   *
   * Here they cannot overlap: the form and the table are the two halves of one
   * ternary, so the row whose switch raises this flag is not on the screen at
   * all while a form is open, and the dialog is only ever opened from the table.
   * The one way the two meet is #204's - แก้ไข pressed from under the open
   * dialog, with the keyboard until 18 ตุลาคม 2569 and after ยกเลิก since #217 contained
   * the focus - and that opens a form whose own บันทึก is behind
   * `busy`, which is this flag, already raised by the write the dialog is
   * waiting for - which is the state #142 asks for: every control that starts a
   * write is disabled while one is out. `Departments.js` holds two flags and
   * derives this one from them, because its แก้ไข reads the row it opens and a
   * read landing late must not put a write's flag down; this screen's แก้ไข
   * reads nothing - the row it opens is already in `data`. (Measured 16 October
   * 2569.)
   */
  const [busy, setBusy] = useState(false)

  // Which generation of its data this screen is drawn from - #198. A switch of
  // hats that lands where the router already is raises it in `MainPage`, and
  // this screen reads its list again instead of being unmounted, so the page,
  // the filter and an account typed into the form but not yet saved all
  // survive the switch.
  // `context/ScreenGeneration.js` carries why #155's remount was narrowed.
  const generation = useScreenGeneration()

  // #215 - the role column names each grant's scope by kind and name and not
  // by its code alone, in `GrantPicker`'s wording. The names come from the same
  // answer the form's pickers are drawn from, which this screen was not asking
  // for until now; `scopeNamed` says what a code outside that answer reads as,
  // and the hook reads the generation above for the same reason `load` does.
  const grantable = useGrantable()

  /**
   * #68 - the answer that is drawn is the answer to the request the screen is
   * still on; without the flag the answer that **arrives** last wins rather
   * than the one asked for last. The rule, the three rows that prove it, and
   * why fifteen panels repeat it rather than share one hook, are written on
   * `frontend/src/pages/Students.js`.
   */
  const load = useCallback(async isCurrent => {
    setLoading(true)
    try {
      const answer = await listUsers({ ...filters, page, per_page: PAGE_SIZE })
      if (isCurrent()) setData(answer)
      // Whether it drew, for a handler that has a sentence to say - #203. It
      // answers *the read was not refused* and not *the screen is still the one
      // that asked*, which is the caller's own second clause (#202).
      return true
    } catch (error) {
      // A 401 already raises the shell's dialog; saying it again here would
      // put a banner behind that dialog.
      if (isCurrent() && !error.expired) setNotice({ error: true, message: error.message })
      return false
    } finally {
      if (isCurrent()) setLoading(false)
    }
    // `generation` is in this list and read nowhere in the body on purpose:
    // what it changes is *when* this read happens, not what is asked for, so
    // the rule below sees a dependency it cannot account for - #198.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page, generation])

  useEffect(() => {
    let current = true
    load(() => current)
    return () => {
      current = false
    }
  }, [load])

  /**
   * #140 - the list a handler reloads is drawn only if it is still the list the
   * screen is on: nothing tears a handler down, so it asks whether `load` is
   * still the one it was sent with. `frontend/src/pages/Students.js` carries the
   * reasons.
   */
  const onScreen = useRef(load)
  useEffect(() => {
    onScreen.current = load
  }, [load])

  // Memoised because the grants panel re-reads its list whenever its error
  // handler changes identity: a fresh closure every render would put that read
  // in a loop.
  const report = useCallback(error => {
    if (!error.expired) setNotice({ error: true, message: error.message })
  }, [])

  /**
   * The last thing that opened on this screen - #146. เพิ่มผู้ใช้งาน and แก้ไข write
   * it; ยกเลิก does not, and neither does the save that closes its own form. A
   * save whose answer finds a different opening closes nothing and says nothing,
   * neither its banner nor its refusal; one that finds nothing in its place says
   * what it did. `Departments.js` carries the reasons.
   */
  const showing = useRef(null)

  const save = async draft => {
    const sent = showing.current
    setBusy(true)
    try {
      if (editing?.user_id) await updateUser(editing.user_id, draft)
      else await createUser(draft)
      const said = { error: false, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' }
      if (showing.current === sent) setEditing(null)
      // #203 - the sentence waits for the reload to draw. `Departments.js`
      // carries the reasons.
      const drawing = onScreen.current
      const reloaded = await drawing(() => onScreen.current === drawing)
      if (reloaded && showing.current === sent) setNotice(said)
    } catch (error) {
      if (showing.current === sent) report(error)
    } finally {
      setBusy(false)
    }
  }

  /**
   * The one row this administrator may not switch off: their own.
   *
   * Read from the shell's profile rather than from anything on this screen,
   * because the list is what the server sent and carries no mark saying which
   * row is the reader. `profile` is null for the moment before `/api/me`
   * answers, and a null id matches no account, so the column draws as it
   * always did until the answer arrives - which is the right way round: a
   * button wrongly enabled for an instant is refused by the server, where a
   * button wrongly disabled would be a control nobody can get back.
   */
  const isSelf = user => Boolean(profile) && user.user_id === profile.user_id

  /**
   * What a status change is going to do, and to whom - #86.
   *
   * The control was a `Switch` in the สถานะ column of the delivered screen and
   * it asked this question through a `StatusConfirmModal` of its own; the
   * rebuild drew a text button beside แก้ไข and dropped the question, which the
   * walk of 21 สิงหาคม 2569 recorded and #86 asked the specification owner
   * about. The answer was to ask in both directions, from the button where it
   * now is. So what is restored is the question and not the switch: the button
   * stays, because that is what every other row of this table's จัดการ column
   * looks like and the walked rows of sheet `11` are written about it.
   *
   * The question is the shared `ConfirmDialog` - #14's, which eighteen other
   * screens ask through - so three things about the delivered box cannot come
   * back with it, and each is a decision rather than an inheritance (#45). Its
   * heading and its confirming button are the delivered words,
   * *ยืนยันการเปลี่ยนสถานะ* and *ยืนยันการเปลี่ยน*. Its sentence is not: the
   * delivered one read *ต้องการ ปิดการใช้งาน การใช้งานบัญชีของ …*, with the
   * verb drawn in red or green inside it and *การใช้งาน* written twice, and
   * this dialog takes one string and colours nothing. The sentence below says
   * the same thing in the words this screen's own button and its own banner
   * already use. And the confirming button is red in both directions, where the
   * delivered box coloured the verb by direction - one dialog, one palette.
   */
  const startSwitch = user => {
    // As ลบ does on the nine screens that ask before a removal: a sentence
    // about what just happened does not stand over a question about what is
    // going to.
    setNotice(null)
    setSwitching(user)
  }

  /**
   * The sentence belongs to the screen that was asked - #202.
   *
   * The rule `save` above has followed since #146. Until #86 this was the shape
   * of it that asks nothing first, and the way in was an ordinary click: the
   * list stayed live while the switch was out, so แก้ไข on another row put
   * *ระงับ…เรียบร้อยแล้ว* over that row's form. The question has not closed that
   * way in: it became the keyboard one the nine removals had (#204), and
   * `202a`'s own rows say so with the date. Since #217 contained the focus on
   * 18 ตุลาคม 2569 it is ยกเลิก and then a click, which `202a`'s rows now take.
   * Only the sentence is asked about - the list is reloaded whichever way the
   * comparison goes (#131). `Departments.js` carries the reasons.
   *
   * The box goes whatever the answer was, and a refusal is said wherever the
   * person has moved to: a 403 about this account is news for them and not for
   * the screen they asked about (#179). That is said here rather than in the
   * `catch` below because four mutants from four closed tickets are anchored on
   * that `catch` - it is what tells this handler apart from `save` above - and a
   * mutant is anchored on the code it breaks, never on the comment beside it
   * (#121).
   */
  const confirmSwitch = async () => {
    const user = switching
    const sent = showing.current
    const next = suspends(user) ? 'inactive' : 'active'
    setBusy(true)
    try {
      await setUserStatus(user.user_id, next)
      setSwitching(null)
      const said = {
        error: false,
        message:
          next === 'inactive'
            ? 'ระงับการใช้งานบัญชีเรียบร้อยแล้ว'
            : 'เปิดใช้งานบัญชีเรียบร้อยแล้ว',
      }
      // #203 - the sentence waits for the reload to draw. `Departments.js`
      // carries the reasons.
      const drawing = onScreen.current
      const reloaded = await drawing(() => onScreen.current === drawing)
      if (reloaded && showing.current === sent) setNotice(said)
    } catch (error) {
      setSwitching(null)
      report(error)
    } finally {
      setBusy(false)
    }
  }

  // A filter changing has to send the reader back to the first page: staying
  // on page four of a result that now has one page shows an empty table and
  // reads as "no such user".
  const filter = key => event => {
    const { value } = event.target
    setPage(1)
    setFilters(current => ({ ...current, [key]: value }))
  }

  return (
    <div className="space-y-6">
      <Notice notice={notice} />

      {editing ? (
        <>
          <UserForm
            user={editing.user_id ? editing : null}
            onSubmit={save}
            onCancel={() => {
              // ยกเลิก does not write this: a form closing is nobody taking the
              // screen, and a save still out is owed its sentence (#146).
              setNotice(null)
              setEditing(null)
            }}
            busy={busy}
          />
          {/*
            Only for an account that exists. A grant needs somebody to grant it
            to, and the first one is made with the account by the form above;
            everything after it is #12 and is managed here, one at a time.
          */}
          {editing.user_id && <GrantsPanel user={editing} onError={report} />}
          {/*
            #13, and the same condition for the same reason: a history is what
            an account has done, and an account being added has done nothing.
          */}
          {editing.user_id && (
            <HistoryPanel key={editing.user_id} user={editing} onError={report} />
          )}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap gap-3">
              <input
                className={`${control} w-64`}
                value={filters.q}
                onChange={filter('q')}
                placeholder="ค้นหาชื่อ อีเมล หรือรหัสผู้ใช้"
              />
              <select
                className={control}
                value={filters.role}
                onChange={filter('role')}
              >
                <option value="">ทุกบทบาท</option>
                {[
                  'FULL_ADMIN',
                  'FACULTY_ADMIN',
                  'DEPT_ADMIN',
                  'PROG_MANAGER',
                  'TEACHER',
                  'EXT_ASSESSOR',
                ].map(role => (
                  <option key={role} value={role}>
                    {roleName(role)}
                  </option>
                ))}
              </select>
              <select
                className={control}
                value={filters.status}
                onChange={filter('status')}
              >
                <option value="">ทุกสถานะ</option>
                <option value="active">ใช้งานอยู่</option>
                <option value="inactive">ถูกระงับ</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                showing.current = {}
                setNotice(null)
                setEditing({})
              }}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary_hover"
            >
              เพิ่มผู้ใช้งาน
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3">รหัสผู้ใช้</th>
                  <th className="px-4 py-3">ชื่อ-นามสกุล</th>
                  <th className="px-4 py-3">อีเมล</th>
                  <th className="px-4 py-3">บทบาท</th>
                  <th className="px-4 py-3">ช่วงเวลาใช้งาน</th>
                  <th className="px-4 py-3">สถานะ</th>
                  <th className="px-4 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      กำลังโหลด…
                    </td>
                  </tr>
                )}
                {!loading && data.users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      ไม่พบผู้ใช้งานตามเงื่อนไขที่เลือก
                    </td>
                  </tr>
                )}
                {!loading &&
                  data.users.map(user => (
                    <tr key={user.user_id}>
                      <td className="px-4 py-3">{user.user_id}</td>
                      <td className="px-4 py-3">
                        {personName(user)}
                      </td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">
                        {(user.roles ?? [])
                          .map(
                            grant =>
                              `${roleName(grant.role_id)} (${scopeNamed(
                                grantable.scopes,
                                grant.scope_id,
                              )})`,
                          )
                          .join(', ') || '—'}
                      </td>
                      <td className="px-4 py-3">{windowOf(user)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            STATUS[user.status]?.className ?? ''
                          }`}
                        >
                          {STATUS[user.status]?.label ?? user.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            showing.current = {}
                            setNotice(null)
                            setEditing(user)
                          }}
                          className="rounded-lg px-3 py-1.5 text-secondary hover:bg-blue-50"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => startSwitch(user)}
                          disabled={isSelf(user)}
                          title={isSelf(user) ? CANNOT_SUSPEND_SELF : undefined}
                          className="rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-transparent"
                        >
                          {suspends(user) ? 'ระงับ' : 'เปิดใช้งาน'}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <Pager
            page={page}
            shown={data.page}
            total={data.total}
            perPage={PAGE_SIZE}
            onPage={setPage}
          />

          <ImportPanel
            title="นำเข้าผู้ใช้งานจากไฟล์"
            subtitle="ดาวน์โหลดแบบฟอร์ม กรอกข้อมูล แล้วอัปโหลดกลับ หากมีแถวใดผิดพลาดระบบจะไม่บันทึกรายการใดเลย"
            notes={IMPORT_NOTES}
            templateName="users-template.csv"
            target="users"
            fetchTemplate={importTemplate}
            send={importUsers}
            onImported={() => {
              // Going to page one is a change the effect fetches; asking `load`
              // as well would ask from the page being left, and the two answers
              // would race - #68. Only the branch already on page one, where
              // nothing refetches, reloads by hand.
              const drawing = onScreen.current
              if (page === 1) drawing(() => onScreen.current === drawing)
              else setPage(1)
            }}
            onStart={() => setNotice(null)}
            onError={report}
          />
        </>
      )}

      {/*
        Outside the ternary, like the nine removals: a form opened from under
        the open box (#204; reached by dismissing it since #217, 18 ตุลาคม 2569) must not
        take the question away with it, because the write it is waiting for is
        still out.
      */}
      <ConfirmDialog
        open={Boolean(switching)}
        title="ยืนยันการเปลี่ยนสถานะ"
        message={switching ? asks(switching) : ''}
        confirmLabel="ยืนยันการเปลี่ยน"
        busy={busy}
        onConfirm={confirmSwitch}
        onCancel={() => {
          setNotice(null)
          setSwitching(null)
        }}
      />
    </div>
  )
}
