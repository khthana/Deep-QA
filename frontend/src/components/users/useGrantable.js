import { useEffect, useState } from 'react'

import { listGrantable } from '../../api/users'
import { useScreenGeneration } from '../../context/ScreenGeneration'

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

  // #198's second half, which #215 made reachable here. What may be offered is
  // a property of the grant the reader is wearing, and since #215 it is also
  // what names the scopes the accounts list *draws* - on a screen that is a
  // landing and is re-read rather than remounted when a hat is switched in
  // place. Without this dependency the list would carry the old hat's names,
  // which is `Rubrics`'s and `Programs`'s second read one screen along. The
  // two callers inside the editor's form are unmounted with it either way, so
  // for them this changes nothing.
  const generation = useScreenGeneration()

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
    // `generation` is read nowhere in the body on purpose: what it changes is
    // *when* this read happens, not what is asked for - #198.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generation])

  return grantable
}
