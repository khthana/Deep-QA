import { useState } from 'react'

export const useAddUser = (fetchUserList) => {
  const [loading, setLoading] = useState(false)

  const addUser = async (formData, profile, setAlert, onClose, setFormData) => {
    if (!formData) return

    setLoading(true)

    const dataToSend = { ...formData, user_email: profile.email }
    onClose()

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/user/add_user`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify(dataToSend),
        },
      )

      const data = await res.json()

      // console.log(data)

      if (res.ok) {
        fetchUserList()
        setAlert({
          open: true,
          message: 'เพิ่มผู้ใช้งานสำเร็จ',
          severity: 'success',
        })

        setFormData({
          email: '',
          phone: '',
          title_th: '',
          first_name_th: '',
          last_name_th: '',
          title_en: '',
          first_name_en: '',
          last_name_en: '',
          department_name_th: '',
          program_name_th: '',
          password: '',
          role_id: '',
          scope_id: '',
        })
      } else {
        setAlert({
          open: true,
          message: 'เพิ่มผู้ใช้งานไม่สำเร็จ',
          severity: 'error',
        })
      }
    } catch (error) {
      console.error('error', error)
      setAlert({
        open: true,
        message: 'เกิดข้อผิดพลาดในการเพิ่มผู้ใช้งาน',
        severity: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return { addUser, loading }
}
