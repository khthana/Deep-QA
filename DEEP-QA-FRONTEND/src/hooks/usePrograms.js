import { useState, useEffect, useCallback } from 'react'

export const usePrograms = selectedDept => {
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchPrograms = useCallback(async () => {
    if (!selectedDept) return

    setLoading(true)
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/programs/get-program-by-department-id`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify({ department_id: selectedDept }),
        }
      )

      if (!res.ok) throw new Error('Fetch programs failed')

      const data = await res.json()
      setPrograms((data || []).sort((a, b) => a.program_id - b.program_id))
      setError(null)
    } catch (err) {
      console.error('Error fetching programs:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [selectedDept])

  useEffect(() => {
    fetchPrograms()
  }, [fetchPrograms])

  return { programs, loading, error, fetchPrograms }
}
