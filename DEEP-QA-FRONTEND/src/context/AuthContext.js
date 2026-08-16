import { createContext, useState, useEffect, useContext } from 'react'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const isLoggedInFlag = localStorage.getItem('isLoggedIn')
    if (isLoggedInFlag === 'true') {
      fetchProfile()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/protected/profile`,
        {
          credentials: 'include',
          withCredentials: true,
        },
      )

      if (!res.ok) {
        setProfile(null)
        throw new Error('Profile fetch failed')
      }
      const data = await res.json()
      if (profile !== null) {
        setLoading(false)
      }
      setProfile(data)
    } catch (err) {
      // console.error(err)
      localStorage.removeItem('selectedRole')
      localStorage.removeItem('scopeID')
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setLoading(true)

    try {
      localStorage.removeItem('isLoggedIn')
      localStorage.removeItem('selectedRole')
      localStorage.removeItem('scopeID')
      setProfile(null)
      await fetch(`${process.env.REACT_APP_API_URL}/api/auth/logout`, {
        method: 'GET',
        credentials: 'include',
      })
    } catch (error) {
      // console.error(error)
    } finally {
      setTimeout(() => {
        setLoading(false)
        window.location.replace('/')
      }, 0)
    }
  }

  return (
    <AuthContext.Provider
      value={{ profile, setProfile, loading, logout, setLoading }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
