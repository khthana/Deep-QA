import { useState } from 'react'

export const useScope = () => {
  const [scope, setScope] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchScope = async (role, scope_id) => {
    if (!role || !scope_id) return
    console.log(role, scope_id)
    setLoading(true)
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/user_roles/get-scope`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify({
            role,
            scope_id,
          }),
        }
      )
      const data = await res.json()
      setScope(data.scope || null)
      console.log(data)
      setError(null)
    } catch (err) {
      console.error('โหลด scope ไม่สำเร็จ', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  return { scope, loading, error, fetchScope }
}
