import { useState } from 'react'
import { mapRole } from '../components/MapRole'
export const useAddUserRole = fetchUserRole => {
  const [loading, setLoading] = useState(false)

  const addUserRole = async (
    formData,
    selectedUserName,
    setAlert,
    setShowDialog,
    fetchUserList,
    e
  ) => {
    e?.preventDefault()
    const msg = `เพิ่มสิทธ์ ${mapRole(formData.role_id)} ของ ${
      selectedUserName.first_name_th
    } ${selectedUserName.last_name_th}`
    setLoading(true)

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/user_roles/add-user-role`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify(formData),
        }
      )

      await res.json()
      setShowDialog(false)

      if (res.ok) {
        setAlert({
          open: true,
          message: `${msg} สำเร็จ`,
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: `${msg} ไม่สำเร็จ`,
          severity: 'error',
        })
      }

      // refresh roles หลังเพิ่ม
      fetchUserList()
      fetchUserRole()
    } catch (error) {
      console.error('Add user role failed:', error)
      setAlert({
        open: true,
        message: `${msg} เกิดข้อผิดพลาด`,
        severity: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return { addUserRole, loading }
}
