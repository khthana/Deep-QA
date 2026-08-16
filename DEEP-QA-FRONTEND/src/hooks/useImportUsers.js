import { useState } from 'react'

export const useImportUsers = fetchUserList => {
  const [loading, setLoading] = useState(false)

  const importUsers = async (file, assignedBy, setAlert) => {
    if (!file) return alert('กรุณาเลือกไฟล์')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('assigned_by', assignedBy)

    setLoading(true)
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/user/import-users`,
        {
          method: 'POST',
          body: formData,
          credentials: 'include',
          withCredentials: true,
        }
      )
      const data = await res.json()

      if (res.ok) {
        setAlert({
          open: true,
          message: 'นำเข้าไฟล์ผู้ใช้งาน สำเร็จ',
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: 'นำเข้าไฟล์ผู้ใช้งาน ไม่สำเร็จ',
          severity: 'error',
        })
      }

      fetchUserList()
      console.log('Import success:', data)
    } catch (error) {
      console.error('Import file failed:', error)
      setAlert({
        open: true,
        message: 'เกิดข้อผิดพลาดในการนำเข้าไฟล์',
        severity: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return { importUsers, loading }
}
