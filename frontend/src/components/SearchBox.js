import { useEffect, useRef, useState } from 'react'
import { FaSearch } from 'react-icons/fa'

/**
 * How long typing has to stop before the list is asked again - #272.
 *
 * The delivered box filtered the rows in hand on every keystroke
 * (`DEEP-QA-FRONTEND/src/components/SeachSection.js`, `onChange`); the
 * rebuild's list is the server's, so the same box would send a read per
 * character. The owner's answer of 12 November 2569 was *on typing, with a
 * short delay*. The delay decides nothing about what is drawn - which answer is
 * drawn is each screen's `isCurrent` guard (#68) - it only spares the reads
 * nobody would have looked at (#52).
 */
export const SEARCH_DELAY = 300

/**
 * The search box on the left of `PageHeader` - #272, the slot #270 left for it.
 *
 * Drawn as the delivered one was: a magnifier inside a grey box, the
 * placeholder naming what is searched (`ค้นหาภาควิชา`). The placeholder is also
 * its accessible name, because a placeholder alone is not one a screen reader
 * can rely on.
 *
 * It holds what is being typed and hands the parent the term once typing
 * pauses, so the list is keyed on the term the parent holds and never on a
 * keystroke. `value` is where the box starts: the box is drawn in the branch a
 * form replaces, so it is mounted again when the form closes, and it starts
 * from the term the list is filtered on rather than from empty. A term still
 * waiting when the box goes - a form opened within the delay - is dropped
 * rather than sent: sending it would move the list's key while a form is open,
 * which `held-sentences.js` relies on nothing doing (#246), and the box comes
 * back showing the term the list is actually on.
 *
 * A term the list is already on, once trimmed - typed and taken back, or a
 * space added - is not handed on: the server trims it to the same search, so
 * handing it on would only put the person back on page one with nothing else
 * changed (the review of 12 November 2569).
 */
export default function SearchBox({ label, value, onSearch }) {
  const [typed, setTyped] = useState(value)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <SearchField
      label={label}
      value={typed}
      onChange={event => {
        const next = event.target.value
        setTyped(next)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => {
          if (next.trim() !== String(value ?? '').trim()) onSearch(next)
        }, SEARCH_DELAY)
      }}
    />
  )
}

/**
 * What a search box looks like, without what it does - #316, the owner's
 * answer of 27 November 2569 (`docs/ui-consistency.md` rule 7).
 *
 * The magnifier, the grey ground and the blue ring on focus are `SearchBox`'s
 * and live here once, so the two student filters in the side panels of
 * *ผลการเรียนของนักศึกษา* and *ผลระดับหลักสูตรรายบุคคล* look like every other
 * search while keeping what they do: they filter the roll already in hand on
 * every keystroke, with no delay and no read, and they fill their panel
 * (`wide`) where the screens' boxes are `w-64`.
 *
 * `label` is the accessible name and `placeholder` the prompt; the two are the
 * same unless the caller says otherwise, which the filters do, because the
 * placeholder stops naming the field the moment somebody types (#37).
 */
export function SearchField({ label, placeholder = label, value, onChange, wide = false, className = '' }) {
  return (
    <div className={className ? `relative ${className}` : 'relative'}>
      <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
        <FaSearch aria-hidden="true" className="text-gray-500" />
      </div>
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`block ${wide ? 'w-full' : 'w-64'} rounded-lg border border-gray-300 bg-gray-50 p-2 ps-10 text-sm text-gray-900 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500`}
      />
    </div>
  )
}
