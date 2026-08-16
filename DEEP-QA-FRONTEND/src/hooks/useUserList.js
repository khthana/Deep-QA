import { useState, useEffect } from 'react'
import { mapRole } from '../components/MapRole'

export const useUserList = (role) => {
  const [userList, setUserList] = useState([])
  const Scope = localStorage.getItem('scopeID')

  console.log(role, Scope)
  const fetchUserList = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/user/get-user-list`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify({ role_id: mapRole(role), scope_id: Scope }),
        },
      )
      const data = await response.json()
      const sortedData = data.sort((a, b) => {
        const roleA = a.role_list?.[0] || ''
        const roleB = b.role_list?.[0] || ''
        return (rolePriority[roleA] ?? 999) - (rolePriority[roleB] ?? 999)
      })
      setUserList(sortedData)
    } catch (error) {
      console.error('Fetch error:', error)
    }
  }

  useEffect(() => {
    if (role) fetchUserList()
  }, [role])

  return { userList, fetchUserList }
}

const roleOrder = [
  'FULL_ADMIN',
  'FACULTY_ADMIN',
  'DEPT_ADMIN',
  'PROG_MANAGER',
  'TEACHER',
  'STUDENT',
  'GUEST',
]

const rolePriority = roleOrder.reduce((acc, role, index) => {
  acc[role] = index
  return acc
}, {})
