import { createContext, useContext } from 'react'

/**
 * Which generation of its data the open screen is drawn from — #198.
 *
 * #155 settled that a switch of hats which lands where the router already is
 * re-reads the open screen, and nowhere else. The first way that was built was
 * a key on the shell's `<Outlet />`: raising it remounted the screen, which
 * re-read it. #198 asked what else went with the remount and the answer,
 * measured on 23 October 2569, was everything the screen was holding — the
 * page it was on, its filter, and a form typed and not yet saved. The owner
 * chose the narrower mechanism the same day: the generation is handed *down*
 * and each screen that re-reads on it names it as a dependency of its own
 * read, so nothing unmounts and nothing a person authored is thrown away.
 *
 * What reads it is the landing of each role in `components/SidebarItem/menus.js`,
 * because a switch that stays put can only be pressed while the person is
 * standing on the landing of the grant they are putting on — `RoleDropdown`
 * compares exactly those two things. A screen that is nobody's landing is never
 * open when this number moves, so it has nothing to read it for — which is why
 * reading it in `components/results/CohortPickers.js`, a hook three screens
 * that are nobody's landing also use, is inert on those three rather than
 * wrong: the number cannot move while they are the open screen.
 *
 * A landing can read it more than once. `Rubrics` and `Programs` each ask for
 * two lists — their own rows, and the curricula or departments the grant
 * reaches — and both reads name it, because the remount this replaced re-read
 * everything a mount asks for. A read left out of the narrowing is a list of
 * the old hat's drawn over rows of the new one, which is #155's defect the
 * other way round; the review of 23 October 2569 found exactly that pair, and
 * `e2e/tests/198a-a-re-read-that-keeps-the-screen.spec.js` row 3 holds it.
 *
 * `0` as the default and no provider needed to use the hook: a screen rendered
 * outside the shell — a test harness, or a route that is not under `MainPage` —
 * gets a number that never moves, which is the behaviour of a screen nobody can
 * switch hats on. That is deliberately not an error: the alternative is a
 * screen that cannot be mounted on its own.
 */
const ScreenGenerationContext = createContext(0)

/** Wraps the outlet in `MainPage`, which is the one thing that raises it. */
export const ScreenGenerationProvider = ScreenGenerationContext.Provider

/**
 * The generation, for a screen's own read.
 *
 * It goes in the dependency list of the `load` it belongs to rather than into
 * an effect of its own: a second effect would ask the server twice on the
 * mount that every other screen answers once.
 */
export const useScreenGeneration = () => useContext(ScreenGenerationContext)
