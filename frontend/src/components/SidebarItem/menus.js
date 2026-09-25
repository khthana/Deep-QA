import { FULL_ADMIN } from './FullAddmin'
import { FACULTY_ADMIN } from './FacultyAdmin'
import { DEPT_ADMIN } from './DeprtAdmin'
import { PROG_MANAGER } from './ProgManager'
import { TEACHER } from './Teacher'
import { EXT_ASSESSOR } from './ExtAssessor'

/**
 * The menu each role sees — #10's second criterion — and the one thing that
 * can be derived from it before a sidebar exists: where that role belongs.
 *
 * Keyed on the role *code* rather than on its Thai display name, which is what
 * the inherited chain compared against. A menu that turns on a translated
 * string breaks when the translation is edited, and it already had: the
 * external assessor had no name in the map at all, so it fell through to the
 * guest menu.
 *
 * Every set below is the one the delivered system shows, carried over
 * unchanged. That the Central Admin's is one entry long is deliberate and
 * matches both the thesis and CONTEXT.md: they manage accounts and nothing
 * else. Hiding an entry is not what stops another role reaching it - the route
 * refuses them as well - and #10's tests say so at the API.
 *
 * This lives in its own module because two components read it and only one of
 * them draws anything. `SidebarItem` draws the menu; `GuestRoute` needs the
 * first entry of it to know where to send somebody who has just signed in.
 * While `MENUS` sat inside `SidebarItem.js`, the only component that could
 * answer *where does this person belong* was the one that renders the sidebar,
 * so the answer had to be reached in two hops - `/main` first, then the entry -
 * and `/main` was an address people held for as long as the second hop took.
 * #120.
 */
export const MENUS = {
  FULL_ADMIN,
  FACULTY_ADMIN,
  DEPT_ADMIN,
  PROG_MANAGER,
  TEACHER,
  EXT_ASSESSOR,
}

/** The first thing a menu points at. */
export const firstEntry = menu => (menu[0]?.sub ? menu[0].sub[0] : menu[0])

/**
 * Where a signed-in caller belongs: the first entry of their own menu.
 *
 * A rule and not a path. The teacher's menu hangs off `/teacher/`, everybody
 * else's off `/main/`, and a menu reordered by #49 or #79 moves the landing
 * with it — which is what `66a` rows 1–2 assert by reading the address back
 * off the sidebar rather than comparing it against a constant written here.
 *
 * The teacher's second group is about one ตอนเรียน and is not in the menu
 * until one is open (#24), but it is never the first entry either way, so the
 * landing does not have to know about sections: the group that answers here is
 * the one that is always drawn.
 *
 * That is an invariant and not a guarantee, and nothing asserts it. `SidebarItem`
 * resolves the first entry over the menu it has *sliced* for the open section;
 * this resolves it over the whole row. The two agree for every menu in the
 * table because no menu's first group is section-gated, and a menu that led
 * with one would make them disagree - the sidebar highlighting one entry while
 * sign-in went to another. `66a` rows 1–2 would catch it, because they compare
 * the landing against what the sidebar drew rather than against a path.
 *
 * `null` for a role with no menu — today only a role code the map has never
 * heard of. The caller decides what to do with that, because the two callers
 * want different things: `GuestRoute` still has to put the person somewhere,
 * and `SidebarItem` has nothing to highlight.
 */
export const landingPath = role => firstEntry(MENUS[role] ?? [])?.path ?? null
