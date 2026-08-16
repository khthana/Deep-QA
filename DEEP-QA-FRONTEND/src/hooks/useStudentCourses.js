import { useState, useEffect, useCallback } from 'react'

export function useStudentCourses({ subject_id, year, term, section }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchStudentCourses = useCallback(async () => {
    if (!subject_id || !year || !term || !section) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/studentCourse/get-student-in-course`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify({
            academic_year: year,
            semester: term,
            section,
            subject_id,
          }),
        }
      )

      const data = await res.json()
      setStudents(data.data || [])
    } catch (err) {
      console.error('Error fetching students:', err)
      setStudents([])
      setError(err)
    } finally {
      setLoading(false)
      setStudents([])
    }
  }, [subject_id, year, term, section])

  useEffect(() => {
    fetchStudentCourses()
  }, [fetchStudentCourses])

  return { students, loading, error, refetch: fetchStudentCourses }
}
