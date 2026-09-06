import { useCallback, useEffect, useState } from 'react'

import ContentMotionDIV from '../ContentMotionDIV'
import GrantPicker from './GrantPicker'
import useGrantable from './useGrantable'
import { roleName } from '../MapRole'
import { grantRole, listGrants, revokeGrant } from '../../api/users'

/**
 * The roles one person holds, and the adding and revoking of them — #12.
 *
 * Shown beside the details form when an existing account is open, because the
 * ticket's first sentence puts the two together: "an administrator opens a
 * user and manages what that person may do: their personal details, and the
 * list of roles granted to them". They are two calls and two rules, so they
 * are two panels, and the details form no longer has to pretend a role is one
 * of its fields.
 *
 * Every grant is confined to a Faculty, a Department or a Programme, and the
 * pickers offer only what the server said this administrator may hand out. A
 * grant that exceeds their scope is refused by the server whether it came from
 * here or from a request crafted by hand, which is what #12's sixth criterion
 * asks for and what makes this panel a convenience rather than the rule.
 *
 * The list is re-read from the server after every change rather than patched
 * locally, so what is on screen is what the database holds - including the
 * refusals that leave it exactly as it was.
 */

const EMPTY = { role_id: '', scope_id: '' }

/** When a grant was made, as a person reads it. */
const madeOn = value =>
  value
    ? new Date(value).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—'

export default function GrantsPanel({ user, onError }) {
  const grantable = useGrantable()
  const [grants, setGrants] = useState([])
  const [draft, setDraft] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)

  const load = useCallback(async () => {
    try {
      const { roles } = await listGrants(user.user_id)
      setGrants(roles)
    } catch (error) {
      onError(error)
    }
  }, [user.user_id, onError])

  useEffect(() => {
    load()
  }, [load])

  const add = async event => {
    event.preventDefault()
    setBusy(true)
    setNotice(null)
    try {
      const { roles } = await grantRole(user.user_id, draft)
      setGrants(roles)
      setDraft(EMPTY)
      setNotice({ error: false, message: 'เพิ่มบทบาทเรียบร้อยแล้ว' })
    } catch (error) {
      // Kept inside the panel rather than raised to the screen's banner: the
      // refusal is about the grant being attempted, and it belongs next to the
      // pickers that attempted it.
      if (!error.expired) setNotice({ error: true, message: error.message })
    } finally {
      setBusy(false)
    }
  }

  const remove = async grant => {
    setBusy(true)
    setNotice(null)
    try {
      const { roles } = await revokeGrant(
        user.user_id,
        grant.role_id,
        grant.scope_id
      )
      setGrants(roles)
      setNotice({ error: false, message: 'ยกเลิกบทบาทเรียบร้อยแล้ว' })
    } catch (error) {
      if (!error.expired) setNotice({ error: true, message: error.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <ContentMotionDIV className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-medium text-primary">บทบาทที่ได้รับ</h2>
      <p className="mb-4 text-sm text-gray-500">
        หนึ่งบัญชีถือได้หลายบทบาทพร้อมกัน แต่ละบทบาทผูกกับคณะ ภาควิชา
        หรือหลักสูตรหนึ่งแห่ง
      </p>

      {/*
        Announced as well as drawn - #111, with the same assertive-for-a-refusal
        rule `Notice` applies.

        **This markup is a copy of `components/Notice.js` and stays a copy, for
        now.** #111 prefers one component to twenty copies and is right, but
        swapping this one costs two things it did not ask for: `Notice` carries
        no `mb-4`, and this panel spaces its children with explicit margins
        rather than a `space-y-*` stack, so the gap above the table would go;
        and `Notice` scrolls itself into view (#55), which is a behaviour this
        panel has never had. An accessibility fix does not get to change
        spacing and scrolling on the way past.

        That `Notice` was never used here looks like an oversight in #55 rather
        than a decision, and a refusal in this panel can be below the fold for
        the same reason #55 was opened - see
        [#121](https://github.com/khthana/Deep-QA/issues/121).
      */}
      {notice && (
        <div
          role={notice.error ? 'alert' : 'status'}
          className={`mb-4 rounded-lg p-3 text-sm ${
            notice.error
              ? 'bg-red-50 text-red-800'
              : 'bg-green-50 text-green-800'
          }`}
        >
          {notice.message}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2">บทบาท</th>
              <th className="px-4 py-2">ขอบเขต</th>
              <th className="px-4 py-2">ผู้กำหนด</th>
              <th className="px-4 py-2">เมื่อ</th>
              <th className="px-4 py-2 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {grants.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  บัญชีนี้ยังไม่ได้รับบทบาทใด
                </td>
              </tr>
            )}
            {grants.map(grant => (
              <tr key={`${grant.role_id}-${grant.scope_id}`}>
                <td className="px-4 py-2">{roleName(grant.role_id)}</td>
                <td className="px-4 py-2">{grant.scope_id}</td>
                <td className="px-4 py-2">{grant.assigned_by ?? '—'}</td>
                <td className="px-4 py-2">{madeOn(grant.assigned_at)}</td>
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => remove(grant)}
                    disabled={busy}
                    className="rounded-lg px-3 py-1.5 text-red-700 hover:bg-red-50 disabled:opacity-40"
                  >
                    ยกเลิกบทบาท
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={add} className="mt-4 grid items-end gap-4 md:grid-cols-3">
        <GrantPicker
          grantable={grantable}
          value={draft}
          onChange={setDraft}
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy || !draft.role_id || !draft.scope_id}
          className="rounded-lg bg-secondary px-5 py-2.5 text-sm font-medium text-white hover:bg-secondary_hover disabled:opacity-60"
        >
          เพิ่มบทบาท
        </button>
      </form>
    </ContentMotionDIV>
  )
}
