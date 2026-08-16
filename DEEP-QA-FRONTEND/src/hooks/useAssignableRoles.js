import { useState, useEffect } from 'react'

export const useAssignableRoles = (role, targetEmail) => {
  const [canAssignRole, setCanAssignRole] = useState([])

  useEffect(() => {
    if (!role) return

    const finalEmail = targetEmail?.email || 'FULL_ADMIN'

    const fetchAssignableRoles = async () => {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/api/user_roles/assignable-roles`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            withCredentials: true,
            body: JSON.stringify({ role, targetUserEmail: finalEmail }),
          }
        )

        const data = await response.json()
        setCanAssignRole(data.assignableRoles || [])
      } catch (error) {
        console.error('โหลด assignable roles ไม่สำเร็จ', error)
      }
    }

    fetchAssignableRoles()
  }, [role])
  // console.log(canAssignRole)

  return canAssignRole
}
