import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'

import { useAuth } from '../context/AuthContext'
import { roleName } from './MapRole'
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
 */
function RoleDropdown({ setAlert }) {
  const { roles, acting, switchRole } = useAuth()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const dropdownRef = useRef(null)

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
      await switchRole(grant)
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
