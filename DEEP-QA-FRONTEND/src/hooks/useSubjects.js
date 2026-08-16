import { useState, useCallback } from 'react'

export const useSubjects = (selectedDept, setAlert, setIsAddProg) => {
  const [subjectList, setSubjectList] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchSubjects = useCallback(async () => {
    if (!selectedDept) return
    setLoading(true)
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/subjects/get-subject-by-department_id`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ department_id: selectedDept }),
        }
      )

      if (!res.ok) throw new Error('โหลดรายวิชาไม่สำเร็จ')

      const data = await res.json()
      const sortedData = data.sort((a, b) =>
        a.subject_id.localeCompare(b.subject_id)
      )
      setSubjectList(sortedData)
    } catch (err) {
      console.error('Error fetching subjects:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedDept])

  const addSubject = async (form, onSuccess) => {
    console.log(form)
    if (!form.subject_name_th?.trim() || !form.subject_name_en?.trim()) {
      setAlert({
        open: true,
        message: `กรุณากรอกข้อมูล`,
        severity: 'info',
      })
      return
    }

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/subjects/create-subjects`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(form),
        }
      )

      if (!res.ok) throw new Error('ไม่สามารถเพิ่มรายวิชาได้')

      const data = await res.json()
      console.log('เพิ่มรายวิชา:', data)

      setAlert?.({
        open: true,
        message: `เพิ่มรายวิชา ${form.subject_id} ${form.subject_name_th} สำเร็จ`,
        severity: 'success',
      })

      fetchSubjects()
      setIsAddProg(false)
      if (onSuccess) onSuccess()
    } catch (err) {
      console.error(err)
      setAlert?.({
        open: true,
        message: `เพิ่มรายวิชา ${form.subject_id} ${form.subject_name_th} ไม่สำเร็จ`,
        severity: 'error',
      })
    }
  }

  const editSubject = async (form, onSuccess) => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/subjects/update-subjects`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ department_id: selectedDept, ...form }),
        }
      )

      if (res.ok) {
        setAlert?.({
          open: true,
          message: `แก้ไขรายวิชา ${form.subject_id} ${form.subject_name_th} สำเร็จ`,
          severity: 'success',
        })
      } else {
        setAlert?.({
          open: true,
          message: `แก้ไขรายวิชา ${form.subject_id} ${form.subject_name_th} ไม่สำเร็จ`,
          severity: 'error',
        })
      }

      await res.json()
      fetchSubjects()
      setIsAddProg(false)
      if (onSuccess) onSuccess()
    } catch (err) {
      console.error('Error updating subject:', err)
    }
  }
  const deleteSubject = async subject => {
    const msg = `${subject.subject_id} ${subject.subject_name_th}`
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/subjects/delete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ subject_id: subject.subject_id }),
        }
      )

      if (res.ok) {
        setAlert?.({
          open: true,
          message: `ลบรายวิชา ${msg}  สำเร็จ`,
          severity: 'success',
        })
      } else {
        setAlert?.({
          open: true,
          message: `ลบรายวิชา ${msg} ไม่สำเร็จ`,
          severity: 'error',
        })
      }
      const data = await res.json()
      fetchSubjects()
    } catch (err) {
      console.error('Error deleting subject:', err)
    }
  }

  return {
    subjectList,
    loading,
    fetchSubjects,
    addSubject,
    editSubject,
    deleteSubject,
  }
}
