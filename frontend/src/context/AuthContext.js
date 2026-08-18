import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

import { get, onSessionExpired, post, put } from '../api/client'

/**
 * Who is signed in, which of their grants they are working as, and how to
 * change either.
 *
 * The whole of it comes from `GET /api/me` and nothing is cached in
 * localStorage. The inherited context kept `selectedRole`, `scopeID` and
 * `scopeName` there and let them win over what the server said, which is the
 * one thing #10's fourth criterion rules out: the sidebar would be drawn from
 * localStorage while the server decided from the cookie, and the two would
 * disagree the moment a grant was revoked. There is one source of truth for
 * the acting grant and it is the server's answer.
 *
 * `state` is `{ user, roles, acting }` or null when nobody is signed in.
 */

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expired, setExpired] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // `anonymous`: nobody signed in yet is the sign-in page's ordinary
      // state, and a 401 here is that rather than a session that ended.
      setState(await get('/api/me', { anonymous: true }))
    } catch (error) {
      // Not signed in is the ordinary state of the sign-in page, and is not
      // an expiry dialog: there is nothing to have expired yet. A cookie that
      // has run out is the other thing, and this is the request it arrives on:
      // a tab left open past the half hour and then reloaded asks this first
      // and would otherwise be dropped at the sign-in page without a word.
      if (error.reason === 'expired') setExpired(true)
      setState(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  /**
   * Put on another of the caller's own grants. The server re-issues the
   * cookie and answers with the new state, so what is stored here is what the
   * server has agreed to honour and never what was asked for.
   */
  const switchRole = useCallback(async grant => {
    const next = await put('/api/me/acting-role', {
      role_id: grant.role_id,
      scope_id: grant.scope_id,
    })
    setState(next)
    return next
  }, [])

  const changePassword = useCallback(
    (current_password, new_password) =>
      put('/api/me/password', { current_password, new_password }),
    []
  )

  const logout = useCallback(async () => {
    setLoading(true)
    try {
      await post('/api/auth/logout')
    } catch (error) {
      // Signing out of a session the server has already forgotten is still
      // signing out as far as this browser is concerned.
    } finally {
      setState(null)
      setLoading(false)
      window.location.replace('/')
    }
  }, [])

  /**
   * What a screen calls when a request came back 401: the sixth criterion,
   * an idle session ending with an explanation. It is held here rather than
   * per screen so there is one dialog however many requests fail at once.
   */
  const sessionExpired = useCallback(() => setExpired(true), [])

  // Registered once, so a 401 from any request anywhere raises the dialog
  // without that screen having had to remember to. The alternative - each
  // caller catching and calling - is one the first screen to forget breaks
  // silently, and #10's sixth criterion is precisely about silence.
  useEffect(() => {
    onSessionExpired(() => setExpired(true))
    return () => onSessionExpired(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        profile: state?.user ?? null,
        roles: state?.roles ?? [],
        acting: state?.acting ?? null,
        loading,
        setLoading,
        expired,
        sessionExpired,
        reload: load,
        switchRole,
        changePassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
