import { useCallback, useEffect, useRef, useState } from 'react'

import ConfirmDialog from '../ConfirmDialog'
import ContentMotionDIV from '../ContentMotionDIV'
import GrantDialog from './GrantDialog'
import Notice from '../Notice'
import RowAction from '../RowAction'
import useGrantable from './useGrantable'
import { personName } from './personName'
import { grantScope, kindWord } from './scopeLabel'
import { roleName } from '../MapRole'
import { useAuth } from '../../context/AuthContext'
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
 *
 * ## Cards since #303
 *
 * The *สิทธิ์ของระบบ* tab of the account's own page, back in the delivered
 * screen's shape (`EditRoleAssign.js`, `docs/users-screen.md` rule 8): one card
 * per grant, *สิทธิ์ :* and the scope under the word for its kind, a trash can
 * that asks before it revokes, and *เพิ่มสิทธิ์* on the tab bar opening a dialog
 * (`GrantDialog.js`). Two things are this system's and not the delivered one's,
 * both by the owner's answer of 22 November 2569: the small line naming who
 * granted it and when, which #12 records and the delivered cards never showed,
 * and **no rule against revoking the last grant** - that rule was the delivered
 * client's alone and the server never had it, so the screen does not hold a
 * rule the server does not (#11).
 *
 * The sentences say *สิทธิ์*, the tab's word, where until #303 they said
 * *บทบาท* - the owner's answer of 23 November 2569, which moved the server's
 * `selfRevoke` with them. The pickers inside the dialog keep `GrantPicker`'s own
 * captions, which the add form shares.
 */

/**
 * Why every revoke button is dead while your own account is open - #130.
 *
 * A copy of `REFUSALS.selfRevoke`, for the reason `Users.js` gives above its
 * copy of `selfStatus`: create-react-app refuses imports from outside `src/`,
 * so no screen here can read `backend/auth/refusals`. `12a` row 6 asserts this
 * exact attribute equals that constant, so the two part company in a failing
 * test rather than in front of a person.
 *
 * Unlike the suspend button, this one is not decided per row. The server
 * refuses on the account in the path and never looks at the grant - so if this
 * panel is about the reader, every card of it is dead, and a per-card condition
 * here would be a rule the route does not have.
 */
const CANNOT_REVOKE_SELF = 'ยกเลิกสิทธิ์ของตัวเองไม่ได้'

/** When a grant was made, as a person reads it. */
const madeOn = value =>
  value
    ? new Date(value).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—'

/**
 * The word a card writes above a grant's scope - `docs/users-screen.md` rule 8,
 * *คณะ / ภาควิชา / หลักสูตร :* by the kind of the scope. Every grant arrives with
 * its scope's kind since #294 (`backend/auth/scopeNames.js`); one whose unit is
 * gone has none, and reads under *ขอบเขต*.
 */
const kindOf = grant => kindWord(grant.scope_kind) ?? 'ขอบเขต'

/**
 * The scope's name under that word. A unit with no Thai name reads as its kind
 * and its code - the shape `lib/unitNamed.js` gives a name beside a label that
 * already says the kind (#298) - and one with no kind as `grantScope` names it.
 */
const scopeOf = (scopes, grant) =>
  grant.scope_name ||
  (kindWord(grant.scope_kind)
    ? `${kindWord(grant.scope_kind)} ${grant.scope_id}`
    : grantScope(scopes, grant))

/**
 * What the trash can asks - the owner's answer of 23 November 2569, in the
 * shape of the nine removals' questions: what goes, where, and whose. The scope
 * in `grantScope`'s words, the kind written onto the name (#215, #295).
 */
const asksToRevoke = (scopes, grant, user) =>
  `ต้องการยกเลิกสิทธิ์${roleName(grant.role_id)} ${grantScope(scopes, grant)} ของ ${personName(user)} ใช่หรือไม่`

export default function GrantsPanel({ user, onError, adding = false, onAddClosed }) {
  const grantable = useGrantable()
  const { profile } = useAuth()
  const [grants, setGrants] = useState([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  // The grant whose trash can was pressed, waiting for its question - #303.
  const [revoking, setRevoking] = useState(null)

  // #133 - the person this panel is about arrives in a prop, and a prop can
  // change without the component coming down. Today it cannot: since #303 the
  // one mount point is `pages/EditUser.js`, which the route draws with a `key`
  // per account, so a second account is a second mount. The flag is here for
  // the rule rather than for a defect anybody has seen - the day the panel is
  // drawn where a prop can change under it, it is what stops one person's
  // roles being drawn under another's name. `141c` row 4 counts the controls
  // that would make it reachable; the sheet says ยังไม่ได้ทดสอบ, not ไม่ต้องมี.
  // Re-measured on 25 October 2569 (#220), and again on 23 November 2569 for
  // #303: `listGrants`, `grantRole` and `revokeGrant` are imported nowhere
  // else in `src/`. The day anything draws this panel where a prop can change
  // under it, that sentence expires and these three claims need rows; until
  // then ยังไม่ได้ทดสอบ.
  const load = useCallback(async isCurrent => {
    try {
      const { roles } = await listGrants(user.user_id)
      if (isCurrent()) setGrants(roles)
    } catch (error) {
      if (isCurrent()) onError(error)
    }
  }, [user.user_id, onError])

  useEffect(() => {
    let current = true
    load(() => current)
    return () => {
      current = false
    }
  }, [load])

  /**
   * Which account this panel is about, readable after an await - #133, #141.
   *
   * `add` and `remove` below are answered with the whole list of grants, so
   * their answers are drawn exactly like a read and can be superseded exactly
   * like one - *a save's answer is a read*, the rule #133 wrote for
   * `ActivityScores.save`. The flag `load` takes cannot serve here: nothing
   * tears a submit handler down, so what these two ask is *is this still the
   * account I was sent about*, a question about now, which is what a ref is
   * for and a prop closed over cannot answer. The situation is the one `load`'s
   * comment describes and is unreachable for the same reason, so these draw no
   * row either and the sheet says ยังไม่ได้ทดสอบ.
   */
  const onScreen = useRef(user.user_id)
  useEffect(() => {
    onScreen.current = user.user_id
  }, [user.user_id])

  // #303 - the dialog's submit. A refusal is thrown back to the dialog, which
  // draws it beside the pickers that attempted it (until #303 the panel's own
  // notice did, the pickers being under the table), or hands it back here by
  // `onLateRefusal` when that opening is gone; a success is said here, over the
  // cards it added to, and the dialog closes itself - only if it is still the
  // opening that sent it (`GrantDialog`'s docblock, the review of 23 November
  // 2569).
  const add = async draft => {
    setBusy(true)
    setNotice(null)
    try {
      const asked = user.user_id
      const { roles } = await grantRole(asked, draft)
      // The list only if the panel is still about the same account (#133). The
      // notice is said either way, because it is about what the reader did
      // rather than about what is on screen.
      // sentence-after-a-move: the notice is about the grant the reader just
      // made and not about the account in front of them, which is the decision
      // the `if` above is documented with. (#133, re-read by #202)
      if (onScreen.current === asked) setGrants(roles)
      setNotice({ error: false, message: 'เพิ่มสิทธิ์เรียบร้อยแล้ว' })
    } finally {
      setBusy(false)
    }
  }

  /**
   * Whether the account this panel is about is the reader's own - #130.
   *
   * Read from the shell's profile and not from the prop, which is the account
   * the page read and carries no mark saying who is looking at it. `profile`
   * is null until `/api/me` answers, and a null id matches no account, so the
   * buttons are live for that moment - the same way round as `Users.js` chose
   * for #84: a button wrongly live is refused by the server, where a button
   * wrongly dead is a control nobody can get back.
   */
  const isSelf = Boolean(profile) && user.user_id === profile.user_id

  const remove = async grant => {
    setBusy(true)
    setNotice(null)
    try {
      const asked = user.user_id
      const { roles } = await revokeGrant(
        asked,
        grant.role_id,
        grant.scope_id
      )
      // The same question as `add`, for the same reason (#133).
      // sentence-after-a-move: `add`'s decision, for `add`'s reason - the
      // notice is about the grant the reader revoked. (#133, re-read by #202)
      if (onScreen.current === asked) setGrants(roles)
      setRevoking(null)
      setNotice({ error: false, message: 'ยกเลิกสิทธิ์เรียบร้อยแล้ว' })
    } catch (error) {
      // The question goes whatever the answer was, as the status switch's
      // does (#179), and the refusal is said on the tab, where the card is.
      setRevoking(null)
      if (!error.expired) setNotice({ error: true, message: error.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <ContentMotionDIV>
      {/*
        The component the other six screens got - #121.

        This was a copy of `components/Notice.js`, near enough byte for byte,
        and #55 missed it: that ticket said *six screens had this block byte for
        byte* and fixed six. This was the seventh, so the panel drew a refusal
        and never scrolled it into view. The measurements are in
        `mutation/121-grants-notice.py` rather than repeated here.

        The wrapper carries the `mb-4` this panel spaces its children with and
        `Notice` does not have. It is inside the `notice &&` guard so it costs
        no gap when there is nothing to say.
      */}
      {notice && (
        <div className="mb-4">
          <Notice notice={notice} />
        </div>
      )}

      {grants.length === 0 ? (
        <p className="px-4 py-6 text-center text-slate-500">บัญชีนี้ยังไม่ได้รับสิทธิ์ใด</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {grants.map(grant => (
            <li
              key={`${grant.role_id}-${grant.scope_id}`}
              className="rounded-lg border border-gray-200 bg-white p-5 shadow"
            >
              <div className="mb-2 flex items-center justify-between gap-2 text-lg font-semibold text-secondary">
                <span>{roleName(grant.role_id)}</span>
                <RowAction
                  kind="remove"
                  label="ยกเลิกสิทธิ์"
                  onClick={() => {
                    setNotice(null)
                    setRevoking(grant)
                  }}
                  disabled={busy || isSelf}
                  title={isSelf ? CANNOT_REVOKE_SELF : undefined}
                />
              </div>
              {/* The dot before each label is the delivered `EditRoleAssign`'s
                  (rule 8), put back after the review of 23 November 2569. */}
              <dl className="space-y-3 text-gray-700">
                <div>
                  <dt className="inline-flex items-center font-semibold">
                    <span aria-hidden="true" className="me-2 flex h-2 w-2 rounded-full bg-secondary" />
                    สิทธิ์ :
                  </dt>
                  <dd className="ms-5">{roleName(grant.role_id)}</dd>
                </div>
                {/* #215 - the scope by name, the code not drawn since #294;
                    the word for its kind is the card's own label since #303. */}
                <div>
                  <dt className="inline-flex items-center font-semibold">
                    <span aria-hidden="true" className="me-2 flex h-2 w-2 rounded-full bg-secondary" />
                    {kindOf(grant)} :
                  </dt>
                  <dd className="ms-5">{scopeOf(grantable.scopes, grant)}</dd>
                </div>
              </dl>
              {/* Who granted it and when - #12's record, which the delivered
                  cards never showed (the owner's answer of 22 November 2569). */}
              <p className="mt-4 text-xs text-gray-500">
                <span>{grant.assigned_by ?? '—'}</span> ·{' '}
                <span>{madeOn(grant.assigned_at)}</span>
              </p>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <GrantDialog
          grantable={grantable}
          name={personName(user)}
          onSubmit={add}
          onCancel={() => onAddClosed?.()}
          onLateRefusal={setNotice}
        />
      )}

      <ConfirmDialog
        open={Boolean(revoking)}
        title="ยืนยันการยกเลิกสิทธิ์"
        message={revoking ? asksToRevoke(grantable.scopes, revoking, user) : ''}
        confirmLabel="ยกเลิกสิทธิ์"
        busy={busy}
        onConfirm={() => remove(revoking)}
        onCancel={() => setRevoking(null)}
      />
    </ContentMotionDIV>
  )
}
