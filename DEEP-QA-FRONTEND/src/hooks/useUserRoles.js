import { useState, useEffect } from 'react'
import { mapRole } from '../components/MapRole'

export const useUserRoles = selectedUser => {
  const [userRoles, setUserRoles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchUserRole = async () => {
    if (!selectedUser?.email) return
    const scopeID = localStorage.getItem('scopeID')
    const Role = localStorage.getItem('selectedRole')

    setLoading(true)
    // console.log(Role)
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/user_roles/user-roles`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify({
            email: selectedUser.email,
            scope_id: scopeID,
            role_id: mapRole(Role),
          }),
        }
      )

      const data = await res.json()

      if (res.ok) {
        setUserRoles(data.roles || [])
        setError(null)
      } else {
        console.error('Error fetching user role:', data)
        setError(data)
      }
    } catch (err) {
      console.error('Fetch error:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserRole()
  }, [selectedUser])

  return { userRoles, loading, error, fetchUserRole }
}
