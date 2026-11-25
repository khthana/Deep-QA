import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { FaSave, FaUserAlt } from 'react-icons/fa'
import { FaUserGroup } from 'react-icons/fa6'
import { IoSettings } from 'react-icons/io5'
import { MdAssignmentAdd } from 'react-icons/md'

import ContentMotionDIV from '../components/ContentMotionDIV'
import ContentTitle from '../components/ContentTitle'
import GrantsPanel from '../components/users/GrantsPanel'
import Notice from '../components/Notice'
import UserForm from '../components/users/UserForm'
import { alsoOutside } from '../lib/outsideTheFilter'
import { fromQuery, listQuery, USERS } from '../components/users/listAddress'
import { personName } from '../components/users/personName'
import { outsideTheFilters } from './Users'
import { useScreenGeneration } from '../context/ScreenGeneration'
import { getUser, updateUser } from '../api/users'

/**
 * แก้ไขข้อมูลผู้ใช้งานระบบ — one account's own page - #303.
 *
 * `docs/users-screen.md` rules 6-9, and the delivered `EditUser.js`: a page of
 * its own with the account in the address, a heading and the person's name, a
 * button back to the list, and two tabs - *ข้อมูลทั่วไป*, opened in view mode
 * with *แก้ไขข้อมูล* on the tab bar turning into *บันทึกข้อมูล* and *ยกเลิก*, and
 * *สิทธิ์ของระบบ*, whose *เพิ่มสิทธิ์* opens a dialog. The history panel that
 * sat under the old in-place form is not here: history is read on the history
 * page alone (rule 9).
 *
 * **The account is in the address** (`/main/users/edit-user/:userId`), the
 * shape ADR-0004 gives a Section: the page reads it and nothing else, and the
 * server answers for this reader - an account they do not reach is a 404 the
 * same as one that does not exist (ADR-0002), and the page says that sentence
 * instead of drawing an empty form. The delivered screen kept the account in
 * the outlet's state, so a reload lost it; that is the one way this is not the
 * delivered page, and it is the reason the ticket asks for the address.
 *
 * **The list it came from is in the address too**, as its query
 * (`components/users/listAddress.js`): *แสดงรายชื่อผู้ใช้งานทั้งหมด* goes back
 * to that page and filter, and the browser's back button lands on the same
 * place because the list writes its own address as it changes. The same query
 * is what the save below asks whether the account is still inside of - the
 * owner's answer of 23 November 2569 to where #247's sentence goes once an
 * edit is saved away from the list.
 *
 * **The route draws this with a `key` per account** (`EditUser` below), so a
 * typed address naming another account is a new mount and not a prop changing
 * under a mounted page. That is what keeps `GrantsPanel`'s #133 situation
 * unreachable at its one mount point, and what makes this page's own reads
 * belong to one account for their whole life.
 */

const FORM_ID = 'account-details'

const tabClass = selected =>
  `inline-flex items-center rounded-t-lg border-b-2 p-3 ${
    selected
      ? 'border-blue-800 bg-blue-100 text-secondary'
      : 'border-transparent text-gray-500 hover:text-blue-900'
  }`

const primary =
  'flex items-center justify-center gap-2 rounded-lg bg-secondary px-5 py-2.5 text-sm font-medium text-white hover:bg-secondary_hover disabled:opacity-60'

function Account({ userId }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { page, filters } = fromQuery(location.search)
  const generation = useScreenGeneration()

  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  // The refusal of the read itself - an account that is not there for this
  // reader. Drawn instead of the tabs, never beside an empty form.
  const [unread, setUnread] = useState(null)
  const [notice, setNotice] = useState(null)
  const [tab, setTab] = useState('personal')
  // Whether the details are open for editing - the delivered view mode.
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [adding, setAdding] = useState(false)

  /**
   * The account the details form is drawn from, which is the last one read
   * **while the form was not open** - #303, #198.
   *
   * A switch of hats re-reads this page (#198) and a re-read hands a new object
   * whatever it holds, so drawing the form from `account` directly would clear
   * what the person is typing whenever that happened (#232's shape). The header
   * follows every read; the form follows them only in view mode, and is drawn
   * again from the latest one when the person leaves edit mode, by *ยกเลิก* or
   * by a save.
   */
  const [seed, setSeed] = useState(null)
  useEffect(() => {
    if (!open) setSeed(account)
  }, [account, open])
  // Raised by ยกเลิก, so the form is mounted again from the seed and the draft
  // the person typed is gone with it, as the delivered ยกเลิก did.
  const [drawn, setDrawn] = useState(0)

  const load = useCallback(async isCurrent => {
    setLoading(true)
    try {
      const { user } = await getUser(userId)
      if (isCurrent()) {
        setUnread(null)
        setAccount(user)
      }
    } catch (error) {
      // A 401 already raises the shell's dialog.
      if (isCurrent() && !error.expired) setUnread({ error: true, message: error.message })
    } finally {
      if (isCurrent()) setLoading(false)
    }
    // `generation` changes when this read happens, not what it asks - #198.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, generation])

  useEffect(() => {
    let current = true
    load(() => current)
    return () => {
      current = false
    }
  }, [load])

  // Memoised for `GrantsPanel`, whose read is keyed on its error handler.
  const report = useCallback(error => {
    if (!error.expired) setNotice({ error: true, message: error.message })
  }, [])

  /**
   * The last opening of the details - #146 on this page. *แก้ไขข้อมูล* writes
   * it; *ยกเลิก* does not, and a save still out after *ยกเลิก* is owed its
   * sentence. A save whose answer finds a later opening closes nothing and says
   * nothing, because that opening is the person's and the sentence is not
   * about it.
   */
  const showing = useRef({})

  const save = async draft => {
    const sent = showing.current
    setSaving(true)
    try {
      const { user } = await updateUser(userId, draft)
      // A save's answer is a read (#133), and it is of this page's one account,
      // so the header takes it whatever the person has pressed since; the form
      // follows it only once it is out of edit mode (`seed` above).
      setAccount(user)
      if (showing.current === sent) {
        setOpen(false)
        // #247 on this page - the owner's answer of 23 November 2569. The list
        // this page was opened from is in its address, so whether the saved
        // account is still inside that list is asked here, by the list's own
        // predicate, and said with the sentence the seven screens say. An edit
        // cannot move a role or a status, which is what `false` tells it.
        setNotice({
          error: false,
          message: alsoOutside(
            'บันทึกข้อมูลเรียบร้อยแล้ว',
            outsideTheFilters(filters, draft, false)
          ),
        })
      }
    } catch (error) {
      if (showing.current === sent && !error.expired) {
        setNotice({ error: true, message: error.message })
      }
    } finally {
      setSaving(false)
    }
  }

  const name = account ? personName(account) : ''

  return (
    <ContentMotionDIV className="space-y-6 rounded-xl border bg-white p-6 shadow">
      <div className="flex flex-row items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <ContentTitle>แก้ไขข้อมูลผู้ใช้งานระบบ</ContentTitle>
          {name && <p className="text-sm text-gray-700">{name}</p>}
        </div>
        <button
          type="button"
          onClick={() => navigate(`${USERS}${listQuery(page, filters)}`)}
          className="flex max-h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50 hover:text-gray-800 hover:shadow-sm active:scale-95"
        >
          <FaUserGroup aria-hidden="true" className="h-4 w-4" />
          แสดงรายชื่อผู้ใช้งานทั้งหมด
        </button>
      </div>

      <Notice notice={unread ?? notice} />

      {loading && !account && !unread && (
        <p className="py-8 text-center text-slate-500">กำลังโหลด…</p>
      )}

      {account && !unread && (
        <div>
          <div className="flex flex-row flex-wrap items-center justify-between gap-2 border-b border-gray-200">
            <div role="tablist" className="-mb-px flex flex-wrap text-center text-lg font-medium">
              <button
                type="button"
                role="tab"
                id="tab-personal"
                aria-selected={tab === 'personal'}
                aria-controls="panel-personal"
                onClick={() => setTab('personal')}
                className={`me-2 ${tabClass(tab === 'personal')}`}
              >
                <FaUserAlt aria-hidden="true" className="me-2" />
                ข้อมูลทั่วไป
              </button>
              <button
                type="button"
                role="tab"
                id="tab-roles"
                aria-selected={tab === 'roles'}
                aria-controls="panel-roles"
                onClick={() => setTab('roles')}
                className={tabClass(tab === 'roles')}
              >
                <IoSettings aria-hidden="true" className="me-2" />
                สิทธิ์ของระบบ
              </button>
            </div>

            {tab === 'roles' ? (
              <button type="button" onClick={() => setAdding(true)} className={primary}>
                <MdAssignmentAdd aria-hidden="true" className="h-5 w-5" />
                เพิ่มสิทธิ์
              </button>
            ) : !open ? (
              <button
                type="button"
                onClick={() => {
                  showing.current = {}
                  setNotice(null)
                  setOpen(true)
                }}
                className={primary}
              >
                แก้ไขข้อมูล
              </button>
            ) : (
              <div className="flex gap-2">
                <button type="submit" form={FORM_ID} disabled={saving} className={primary}>
                  <FaSave aria-hidden="true" className="text-xl" />
                  บันทึกข้อมูล
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Holds nothing while the save is out (#253): it leaves edit
                    // mode and draws the form again from the last account read.
                    setNotice(null)
                    setOpen(false)
                    setDrawn(count => count + 1)
                  }}
                  className="flex items-center justify-center rounded-lg bg-gray-200 px-5 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-300"
                >
                  ยกเลิก
                </button>
              </div>
            )}
          </div>

          {/* Both panels stay mounted and the one not chosen is hidden, as a
              tab is: a draft typed under ข้อมูลทั่วไป survives a look at
              สิทธิ์ของระบบ, and the grants are read once when the page opens. */}
          <div
            role="tabpanel"
            id="panel-personal"
            aria-labelledby="tab-personal"
            hidden={tab !== 'personal'}
            className="mt-6"
          >
            {seed && (
              <UserForm
                key={drawn}
                id={FORM_ID}
                user={seed}
                readOnly={!open}
                onSubmit={save}
                busy={saving}
              />
            )}
          </div>
          <div
            role="tabpanel"
            id="panel-roles"
            aria-labelledby="tab-roles"
            hidden={tab !== 'roles'}
            className="mt-6"
          >
            <GrantsPanel
              user={account}
              onError={report}
              adding={adding}
              onAddClosed={() => setAdding(false)}
            />
          </div>
        </div>
      )}
    </ContentMotionDIV>
  )
}

/** The route's element: one mount per account in the address - see above. */
export default function EditUser() {
  const { userId } = useParams()
  return <Account key={userId} userId={userId} />
}
