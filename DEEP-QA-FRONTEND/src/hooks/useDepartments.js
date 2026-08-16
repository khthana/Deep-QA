import { useState, useEffect } from 'react'

export const useDepartments = ({
  setSessionExpired,
  isSessionExpired,
} = {}) => {
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchDepartments = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/department/get-all-department`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
        },
      )

      if (isSessionExpired(res)) return setSessionExpired(true)
      const data = await res.json()
      const sortedData = (data || []).sort((a, b) => {
        if (a.department_id < b.department_id) return -1
        if (a.department_id > b.department_id) return 1
        return 0
      })

      setDepartments(sortedData || [])
      setError(null)
    } catch (err) {
      console.error('Fetch department ไม่สำเร็จ', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDepartments()
  }, [])

  // console.log(departments)

  return { departments, loading, error, fetchDepartments }
}
