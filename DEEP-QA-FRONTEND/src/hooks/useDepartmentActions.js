import { useState } from 'react'

export const useDepartmentActions = (fetchDepartments) => {
  const [loading, setLoading] = useState(false)

  const addDepartment = async (formData, setAlert, resetForm, setIsAddDept) => {
    const dept = formData.department_name_th
    const msg = `สร้างภาควิชา ${dept}`
    setLoading(true)
    if (
      !formData.department_name_th?.trim() ||
      !formData.department_name_en?.trim()
    ) {
      setAlert({
        open: true,
        message: `กรุณากรอกชื่อภาควิชา เพื่อเพิ่มข้อมูล`,
        severity: 'info',
      })
      resetForm()
      setIsAddDept(false)
      return
    }

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/department/create-department`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify(formData),
        },
      )

      const data = await res.json()

      if (res.ok) {
        setAlert({
          open: true,
          message: `${msg} สำเร็จ`,
          severity: 'success',
        })
        resetForm()
        fetchDepartments()
      } else {
        setAlert({
          open: true,
          message: `${msg} ไม่สำเร็จ ${data?.message}`,
          severity: 'error',
        })
        resetForm()
        fetchDepartments()
      }
    } catch (err) {
      // console.error('Add department failed:', err)
    } finally {
      setLoading(false)
      setIsAddDept(false)
    }
  }

  const editDepartment = async (formData, setAlert, onSuccess, resetForm) => {
    const msg = `แก้ไข ${formData.department_name_th}`
    setLoading(true)

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/department/edit-department`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify(formData),
        },
      )

      const data = await res.json()

      if (res.ok) {
        setAlert({
          open: true,
          message: `${msg} สำเร็จ`,
          severity: 'success',
        })
        fetchDepartments()
        onSuccess?.()
        resetForm()
      } else {
        setAlert({
          open: true,
          message: `${msg} ไม่สำเร็จ`,
          severity: 'error',
        })
      }
    } catch (err) {
      // console.error('Edit department failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const deleteDepartment = async (department, setAlert) => {
    const msg = `${department.department_name_th}`
    setLoading(true)

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/department/delete-department`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify({ department_id: department.department_id }),
        },
      )

      const data = await res.json()

      if (res.ok) {
        setAlert({
          open: true,
          message: `ลบ ${msg} สำเร็จ`,
          severity: 'success',
        })
        fetchDepartments()
      } else {
        setAlert({
          open: true,
          message: `${msg} ${data?.message}`,
          severity: 'error',
        })
      }
    } catch (err) {
      // console.error('Delete department failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return { addDepartment, editDepartment, deleteDepartment, loading }
}
