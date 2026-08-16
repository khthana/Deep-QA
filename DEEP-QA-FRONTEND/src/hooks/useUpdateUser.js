import { useState } from 'react'

export const useUpdateUser = () => {
  const [loading, setLoading] = useState(false)

  const updateUser = async (
    personalFormData,
    setAlert,
    fnameTH,
    lnameTH,
    setIsEditing,
  ) => {
    setIsEditing(false)
    const msg = `แก้ไขข้อมูล ของ ${fnameTH} ${lnameTH}`
    setLoading(true)

    console.log('Form Data:', personalFormData)

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/user/update_user`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify(personalFormData),
        },
      )

      const data = await res.json()
      console.log('API Response:', data)

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

      console.log('Update success:', data)
    } catch (error) {
      console.error('Update user failed:', error)
      setAlert({
        open: true,
        message: `${msg} เกิดข้อผิดพลาด`,
        severity: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return { updateUser, loading }
}
