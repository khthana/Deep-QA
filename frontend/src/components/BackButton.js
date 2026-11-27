import { HiOutlineArrowLeft } from 'react-icons/hi2'

/**
 * How a back button looks - `docs/ui-consistency.md` rule 9, the owner's
 * answer of 27 November 2569 (#317).
 *
 * A grey-outlined button with an arrow in front, which is what the sections
 * panel's *กลับไปหน้ารายการ* already drew. The words stay each caller's own,
 * because each one names where it goes, and the arrow is `aria-hidden`, so the
 * accessible name is still those words.
 *
 * It is a class and an arrow rather than a component, so a back that is a
 * `<Link>` stays a link and one that is a `<button>` stays a button: the owner
 * changed how they look, not what they are.
 */
export const BACK_BUTTON =
  'inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100'

export function BackArrow() {
  return <HiOutlineArrowLeft aria-hidden="true" className="h-4 w-4" />
}
