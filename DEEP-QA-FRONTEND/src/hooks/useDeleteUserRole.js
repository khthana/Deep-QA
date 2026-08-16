import { useState } from 'react'
import { mapRole } from '../components/MapRole'

export const useDeleteUserRole = fetchUserRole => {
  const [loading, setLoading] = useState(false)

  const deleteUserRole = async (
    fnameTH,
    lnameTH,
    email,
    role_id,
    scope_id,
    setAlert
  ) => {
    const msg = `ลบสิทธ์ ${mapRole(role_id)} ของ ${fnameTH} ${lnameTH}`
    setLoading(true)

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/user_roles/delete_user_role`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify({ email, scope_id, role_id }),
        }
      )

      await res.json()

      setAlert({
        open: true,
        message: `${msg} สำเร็จ`,
        severity: 'success',
      })

      fetchUserRole()
    } catch (error) {
      console.error('Delete user role failed:', error)

      fetchUserRole()
      setAlert({
        open: true,
        message: `${msg} ไม่สำเร็จ`,
        severity: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return { deleteUserRole, loading }
}
