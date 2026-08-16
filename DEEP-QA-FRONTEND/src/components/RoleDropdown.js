import React, { useEffect, useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { mapRole } from './MapRole'
import ContentMotionDIV from './ContentMotionDIV'

function RoleDropdown({ selectedRole, setSelectedRole, Role }) {
  const [open, setOpen] = useState(false)
  const { setLoading } = useAuth()
  const [scopeName, setScopeName] = useState('')
  const dropdownRef = useRef(null)

  const handleSelectRole = item => {
    setLoading(true)
    window.location.reload()
    localStorage.setItem('selectedRole', mapRole(item.role_id))
    localStorage.setItem('scopeID', item.scope_id)
    localStorage.setItem('scopeName', `${item.scope_name} - ${item.year}`)
    setLoading(false)
  }

  useEffect(() => {
    const handleClickOutside = event => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const savedRole = localStorage.getItem('selectedRole')
    const scope = localStorage.getItem('scopeName')
    if (savedRole) {
      setSelectedRole(savedRole)
      setScopeName(scope)
    } else if (Role && Role.length > 0) {
      setSelectedRole(mapRole(Role[0].role_id))
      setScopeName(mapRole(Role[0].scope_name))
      localStorage.setItem('selectedRole', mapRole(Role[0].role_id))
      localStorage.setItem('scopeID', Role[0].scope_id)
      localStorage.setItem(
        'scopeName',
        `${Role[0].scope_name} - ${Role[0].year}`
      )
    }
  }, [Role])

  useEffect(() => {
    const handleClickOutside = event => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!Role) {
    return
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(prev => !prev)}
        id="dropdownDefaultButton"
        data-dropdown-toggle="dropdown"
        className="flex w-auto items-center justify-between rounded-lg bg-white px-5 py-2.5 text-center font-medium text-secondary hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-blue-300"
        type="button"
      >
        {selectedRole}
        {mapRole(selectedRole) === 'PROG_MANAGER' && scopeName && (
          <span>{scopeName}</span>
        )}
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
              {Role.map((item, index) => (
                <li key={index}>
                  <button
                    onClick={() => handleSelectRole(item)}
                    className="w-full whitespace-nowrap rounded-md px-4 py-2 text-left transition-all duration-200 hover:scale-95 hover:bg-blue-100 hover:text-secondary
"
                  >
                    •{' '}
                    {item.role_id === 'PROG_MANAGER'
                      ? `${mapRole(item.role_id)} ${item.scope_name} - ${
                          item.year
                        }`
                      : mapRole(item.role_id)}
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
