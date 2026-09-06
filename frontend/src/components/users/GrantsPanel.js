import { useCallback, useEffect, useState } from 'react'

import ContentMotionDIV from '../ContentMotionDIV'
import GrantPicker from './GrantPicker'
import Notice from '../Notice'
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
        The component the other six screens got - #121.

        This was a copy of `components/Notice.js`, near enough byte for byte,
        and #55 missed it: that ticket said *six screens had this block byte for
        byte* and fixed six. This was the seventh, so the panel drew a refusal
        and never scrolled it into view - on a panel whose controls all sit
        below the banner, the revoke buttons in the table and the add picker
        below that. The measurements are in `mutation/121-grants-notice.py`
        rather than repeated here.

        The wrapper carries the `mb-4` this panel spaces its children with and
        `Notice` does not have. It is inside the `notice &&` guard so it costs
        no gap when there is nothing to say; the header of `Notice` says why it
        is here rather than a prop on the component.

        **Two things came with the swap that this ticket did not ask for**, and
        both are wanted: #111's `role`, which the copy already had, and
        `ContentMotionDIV`'s 180ms fade, which the copy did not - the banner now
        arrives the way every other screen's does, which is the consistency the
        swap was for. `grantsstaysilent` went the other way, deleted with the
        copy it was anchored to.
      */}
      {notice && (
        <div className="mb-4">
          <Notice notice={notice} />
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
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-slate-500"
                >
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
