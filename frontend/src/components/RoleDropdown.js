import React, { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'

import { useAuth } from '../context/AuthContext'
import { roleName } from './MapRole'
import { landingPath } from './SidebarItem/menus'
import ContentMotionDIV from './ContentMotionDIV'

/**
 * The role picker, at the top of the shell.
 *
 * What it shows is `acting` as the server reported it, and what it does is ask
 * the server to change it. The inherited version wrote the choice into
 * localStorage and reloaded the page; the server never heard about it, so the
 * only thing a switch changed was which menu was drawn. #10's fourth criterion
 * says that is not a role switch. Here the choice is a request, the server
 * decides whether the grant is held, and the answer is what gets displayed —
 * so the sidebar cannot come to show a hat the server is not honouring.
 *
 * It also decides where the switch leaves you, which is #81. The sidebar used
 * to be redrawn around somebody still standing on the old grant's route, so
 * the next thing that screen asked for was refused and the refusal read as the
 * consequence of switching. The landing is `landingPath`'s answer - the same
 * rule `GuestRoute` has used since #66 - because putting on a hat is the same
 * question sign-in asks, and a second opinion about where a role belongs is
 * the shape #66 spent a ticket removing.
 *
 * This is the only control that switches grants; a second one would have to do
 * this too, and the navigation lives here rather than in `switchRole` because
 * `AuthProvider` is mounted outside the `Router` (`index.js`) and has no
 * `useNavigate` to call.
 *
 * And it says when that navigation moved nobody, which is #155. Where the
 * landing is the screen already open - two grants of one role code at different
 * scopes always, since `landingPath` is keyed on `role_id` alone - `navigate`
 * goes where the router already is, so nothing unmounts and the open screen
 * goes on showing the rows it fetched under the hat just taken off. The owner
 * settled on 10 October 2569 that the screen is re-read in exactly that case
 * and in no other, so the decision is made here, where both halves are known:
 * the landing this switch is about, and where the router stands. `onStayedPut`
 * is what `Mainpage` keys the open screen on.
 */
function RoleDropdown({ setAlert, onStayedPut }) {
  const { roles, acting, switchRole } = useAuth()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const handleClickOutside = event => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!acting) return null

  /**
   * Why this one still says the code — #215, measured 23 October 2569.
   *
   * #90 gave the two administration screens the words `ชนิด · ชื่อ (รหัส)`,
   * and #215 asked whether the three places that draw a scope for reading get
   * them too. The other two now do, from the list their own pickers are drawn
   * from. This one cannot, for two reasons that are independent of each other:
   * what it draws comes from `/api/me`, whose `allRoles` answers `role_id`,
   * `role_name`, `priority` and `scope_id` and no name or kind at all; and the
   * readers of this label are exactly the two roles `GET /users/grantable`
   * refuses, so borrowing that list would answer 403 and leave the bare code
   * anyway.
   *
   * What would make it reachable is the server carrying the name and the kind
   * on `/api/me`, resolved by `scopeChain`'s own precedence so that the word
   * cannot disagree with the guard — which is a change to an answer every
   * request reads, and the owner's to take. It is
   * [#231](https://github.com/khthana/Deep-QA/issues/231), opened the same
   * day. The delivered screen drew the name and no code, so the wording goes
   * with it (`docs/06` §Out of Scope); its year half is unreachable whatever
   * the answer, a grant holding no academic year (ADR-0003).
   */
  const label = grant =>
    grant.role_id === 'PROG_MANAGER' || grant.role_id === 'EXT_ASSESSOR'
      ? `${roleName(grant.role_id)} ${grant.scope_id}`
      : roleName(grant.role_id)

  const isActing = grant =>
    grant.role_id === acting.role_id && grant.scope_id === acting.scope_id

  const choose = async grant => {
    setOpen(false)
    if (isActing(grant)) return
    setBusy(true)
    try {
      const next = await switchRole(grant)
      // `replace`, because the route being left is one the new grant has no
      // menu entry for: pushing would leave it one Back away, still wearing the
      // hat that cannot use it, which is the state this is here to end.
      //
      // `?? '/main'` is `GuestRoute`'s own fallback for the same `null`, and
      // `menus.js` says why the answer can be `null` at all and why each caller
      // decides for itself: a role code the menu table has never heard of. The
      // server has just confirmed the grant is held, so reaching it means the
      // table and the role list have come apart - `/main` is then somewhere to
      // stand rather than a guess at what they meant.
      const landing = landingPath(next.acting.role_id) ?? '/main'
      navigate(landing, { replace: true })
      // #155. Read before the navigation is believed to have moved anything:
      // `location` is this render's, which is where the router was when the
      // press happened, and a landing equal to it is a navigation that changes
      // nothing. Announcing it unconditionally instead - keying the open screen
      // on the acting grant - would remount the screen being left on the way
      // out, firing its load under a hat that may not read it.
      // What it cannot tell apart: a navigation that happened while the
      // switch was in flight - the shell moving on a 401, say. `location`
      // is then the address of a render that has been left, and the
      // comparison can say *stayed put* about a press that moved. The cost
      // is one remount of a screen that has just mounted, which is why
      // this is written down rather than guarded.
      if (landing === location.pathname) onStayedPut?.()
    } catch (err) {
      // A grant revoked between the page loading and this click comes back
      // 403 roleNotHeld. Without this the promise rejects, the picker closes
      // and the person sees nothing change and nothing said. A 401 is already
      // announced by the client, which raises the expiry dialog; saying it
      // twice would put an alert behind that dialog.
      if (!err.expired) {
        setAlert?.({ open: true, message: err.message, severity: 'error' })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(prev => !prev)}
        disabled={busy}
        className="flex w-auto items-center justify-between rounded-lg bg-white px-5 py-2.5 text-center font-medium text-secondary hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-60"
        type="button"
      >
        {label(acting)}
        <svg
          className="ms-3 h-2.5 w-2.5"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 10 6"
        >
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="m1 1 4 4 4-4"
          />
        </svg>
      </button>

      {/* `AnimatePresence` and not `RetiringPresence` - #227, measured on
          25 October 2569 with
          `e2e/probes/169-presence-without-frames.js sites`. Closed with the
          tab backgrounded the list was still in the document at 0.5, 1 and 3
          seconds, at `opacity: 1` (0.999788 on one of the two runs, the
          enter's own last frame frozen by the same absence of frames),
          `pointer-events: auto`, 1 control focusable, 6 accessibility nodes
          and none of them ignored. The way in
          is what it lacks: `open` is written by the trigger and by `choose`,
          which lowers it **before** awaiting `switchRole`, so no answer can
          ever close this list - reaching the state means backgrounding the tab
          inside the 183ms fade (186ms after an earlier hide). The accepted
          price is those 183ms, and what is paid at the far end is one fade at
          most: the tween resumed on the first frame after the return either
          jumps straight to its end (gone in 4-8ms, 1 sampled frame) or runs
          the fade out (13 frames of 62, the last at 192ms) - both were read on
          this same code on 25 October 2569, which makes it a property of the
          resumed tween and not of the site. */}
      <AnimatePresence>
        {open && (
          <ContentMotionDIV className="absolute z-10 mt-2 w-auto divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-lg">
            <ul className="py-2 text-gray-700">
              {roles.map(grant => (
                <li key={`${grant.role_id}-${grant.scope_id}`}>
                  <button
                    onClick={() => choose(grant)}
                    className={`w-full whitespace-nowrap rounded-md px-4 py-2 text-left transition-all duration-200 hover:scale-95 hover:bg-blue-100 hover:text-secondary ${
                      isActing(grant) ? 'text-secondary' : ''
                    }`}
                  >
                    • {label(grant)}
                  </button>
                </li>
              ))}
            </ul>
          </ContentMotionDIV>
        )}
      </AnimatePresence>
    </div>
  )
}

export default RoleDropdown
