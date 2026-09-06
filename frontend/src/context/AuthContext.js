import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
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
      // No flag any more - #97. This call used to pass `anonymous: true` to
      // stop `client.js` counting its 401 as an expiry, back when it counted
      // every 401 it was not told to ignore. It now reads the server's reason,
      // and the reason this call gets on a first visit is `anonymous`.
      setState(await get('/api/me'))
    } catch {
      // Nobody signed in, and that is all this knows - #97. A tab left open
      // past the half hour and then reloaded arrives here too, and it is the
      // one request that identifies it, but raising the dialog *from here* is
      // no longer this function's job: the listener below sees the same 401
      // with the same reason and decides for every request in the
      // application, this one included.
      //
      // It used to do both, and the sweep is what said so. `silentexpiry` -
      // the mutant that took the raise out of this catch - killed nothing,
      // because the listener covered it; and `silent401` - the mutant that
      // stops the listener being called at all - could not kill the reload
      // row, because this catch covered *that*. Two components holding one
      // opinion is not redundancy that makes a thing safer. It is an opinion
      // neither of them can be shown to hold.
      setState(null)
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Whether anybody is signed in, readable from the listener below.
   *
   * A ref rather than the state itself because the listener is registered
   * once: `state` captured inside it would be the `null` it held on mount,
   * for ever.
   *
   * Written from an effect rather than during render, so it describes a tree
   * that actually committed. Writing it during render is the shorter version
   * and is correct today - every `setState` here happens outside render - but
   * a render React throws away (a transition, a suspended tree) would leave
   * this describing something nobody ever saw, and the thing it would get
   * wrong is *whether to tell somebody their session ended*.
   */
  const signedIn = useRef(false)
  useEffect(() => {
    signedIn.current = state !== null
  }, [state])

  /**
   * Registered once, so a 401 from any request anywhere raises the dialog
   * without that screen having had to remember to. The alternative - each
   * caller catching and calling - is one the first screen to forget breaks
   * silently, and #10's sixth criterion is precisely about silence.
   *
   * **Which 401s mean a session ended - #97.** Two of them do, and they are
   * not distinguishable by status alone, which is what the old rule got wrong:
   *
   * - `expired`, whatever the client believed. A tab left open past the half
   *   hour and then reloaded asks `GET /api/me` before anything is signed in
   *   here, so nothing but the server's word identifies it.
   * - *any* 401 arriving while somebody **is** signed in. The cookie went away
   *   mid-session - cleared by hand, or a token this server did not sign - and
   *   the server answers `anonymous`, because from where it stands there is
   *   nothing to have expired. Only this side knows there was.
   *
   * Everything else is an ordinary refusal on a screen nobody has entered:
   * a first visit reading `/api/me`, and a wrong password. Those are the two
   * the dialog used to be drawn over.
   */
  useEffect(() => {
    onSessionExpired(reason => {
      if (reason === 'expired' || signedIn.current) setExpired(true)
    })
    return () => onSessionExpired(null)
  }, [])

  // After the listener above. The order is not what makes this safe - `load`
  // is async, so its rejection lands a task later, after every effect in this
  // commit has run, and the listener would be registered either way. It reads
  // in the order it happens, which is worth more than it costs.
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

  /*
   * `sessionExpired` was exported here for a screen to call when a request
   * came back 401. #97 removed its one caller - `Navbar`, on a failed password
   * change - because a screen calling it is a screen deciding what a 401
   * means, and that decision now happens in exactly one place, below. A hatch
   * with no user is a way for the next screen to reintroduce the defect.
   */

  return (
    <AuthContext.Provider
      value={{
        profile: state?.user ?? null,
        roles: state?.roles ?? [],
        acting: state?.acting ?? null,
        loading,
        setLoading,
        expired,
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
