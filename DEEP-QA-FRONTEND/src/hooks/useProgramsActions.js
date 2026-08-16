import { useState, useCallback, useEffect } from 'react'

export const useProgramsActions = (selectedDept, fetchPrograms) => {
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const addProgram = async (payload, resetForm, setAlert, setIsAddProg) => {
    console.log(payload)
    if (!payload.program_name_th?.trim() || !payload.program_name_en?.trim()) {
      setAlert({
        open: true,
        message: `กรุณากรอกข้อมูล`,
        severity: 'info',
      })
      setIsAddProg(false)
      return
    }
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/programs/create-programs`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify(payload),
        },
      )
      const data = await res.json()

      if (res.ok) {
        setAlert({
          open: true,
          message: `เพิ่มหลักสูตร ${payload.program_name_th} สำเร็จ`,
          severity: 'success',
        })
        resetForm()
        setIsAddProg(false)
        fetchPrograms()
      } else {
        setIsAddProg(false)
        setAlert({
          open: true,
          message: `เพิ่มหลักสูตร ไม่สำเร็จ`,
          severity: 'error',
        })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const editProgram = async (payload, resetForm, setAlert, setEditRow) => {
    setEditRow(null)
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/programs/edit-programs`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify(payload),
        },
      )
      const data = await res.json()

      if (res.ok) {
        setAlert({
          open: true,
          message: `แก้ไขหลักสูตร ${payload.program_name_th} สำเร็จ`,
          severity: 'success',
        })
        resetForm()
        fetchPrograms()
      } else {
        setAlert({
          open: true,
          message: `แก้ไขหลักสูตร ไม่สำเร็จ`,
          severity: 'error',
        })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const deleteProgram = async (program_id, program_name_th, setAlert) => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/programs/delete-programs`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify({ program_id }),
        },
      )
      const data = await res.json()

      if (res.ok) {
        setAlert({
          open: true,
          message: `ลบหลักสูตร ${program_name_th} สำเร็จ`,
          severity: 'success',
        })
        fetchPrograms()
      } else {
        setAlert({
          open: true,
          message: `${data?.message}`,
          severity: 'error',
        })
      }
    } catch (err) {
      console.error(err)
      setAlert({
        open: true,
        message: `ลบหลักสูตรไม่สำเร็จ`,
        severity: 'error',
      })
    }
  }

  return {
    programs,
    loading,
    error,
    fetchPrograms,
    addProgram,
    editProgram,
    deleteProgram,
  }
}
