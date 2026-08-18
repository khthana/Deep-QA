import { useEffect, useState } from 'react'

import { listGrantable } from '../../api/users'

/**
 * The roles and scopes the signed-in administrator may hand out — #12.
 *
 * Asked of the server rather than listed here. #11 wrote the six role codes
 * into this component's own array, which made the file a third place role
 * identity lived - beside `roles.priority` and the route's ADMIN_ROLES - and
 * offered every administrator all six regardless of their own seniority. The
 * server already answers exactly what may be offered, so the array is gone and
 * the answer is fetched.
 *
 * It is a convenience and never a guard: the same grant posted past these
 * pickers is refused on the same rule, and #12's sixth criterion is a test
 * that proves it. If the fetch fails the pickers come up empty rather than
 * falling back to a hard-coded list, because a fallback list is a list nobody
 * checked.
 */
export default function useGrantable() {
  const [grantable, setGrantable] = useState({ roles: [], scopes: [] })

  useEffect(() => {
    let live = true
    listGrantable()
      .then(answer => live && setGrantable(answer))
      // A 401 has already raised the shell's dialog and a 403 means this
      // caller has nothing to offer; neither is worth a second banner over a
      // picker that is simply empty.
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])

  return grantable
}
