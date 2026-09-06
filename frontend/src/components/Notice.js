import { useEffect, useRef } from 'react'

import ContentMotionDIV from './ContentMotionDIV'

/**
 * The banner a screen answers with, and the one thing it has to do besides
 * being on the page: be where the person is looking — ticket #55.
 *
 * The content pane in `pages/Mainpage.js` scrolls on its own, and the banner is
 * drawn at the top of the page body, above the form. Someone filling in a long
 * form is at the bottom of that pane when they press บันทึก; the answer arrives,
 * the banner appears, and it appears above the fold. Nothing takes it away — it
 * is simply never seen. #55 says the error case is the one that matters: a
 * refusal nobody reads is a save the person believes went through.
 *
 * Six screens had this block byte for byte, so the fix is this component and
 * not six copies of a scroll call. #55 asked for it once; this is once.
 *
 * ## Why `scrollIntoView` and not `scrollTop = 0`
 *
 * Setting the pane's scroll to zero means finding the pane, and the only handle
 * on it is a Tailwind class in a file this component does not own. It also
 * moves the page when the banner was already visible, which is a new defect for
 * anyone reading a list under a standing banner.
 *
 * `block: 'nearest'` scrolls only when the element is out of view, and scrolls
 * the least it can. That is exactly what the ticket asks and no more, and it
 * works in any scroll container, including one nobody has written yet.
 *
 * ## Why the effect is keyed on the notice and not on its text
 *
 * The first draft keyed it on `message` and `error`, to avoid re-scrolling on a
 * re-render that changed nothing. That was the wrong guard for the wrong thing:
 * `notice` is state, so its identity is already stable between the calls that
 * set it, and keying on the text instead broke the case that matters most — a
 * refusal repeated. Press บันทึก on the same duplicate code twice and the
 * second refusal has the same two strings as the first, so nothing re-fired and
 * the banner stayed above the fold on exactly the attempt where the person had
 * scrolled back down to fix something. `55a`'s third test is that case.
 *
 * ## The shape
 *
 * `{ message, error }`, as all six screens already held it, and held in state —
 * a caller that builds the object inline hands this a new identity on every
 * render and gets a scroll on every render with it. `UserHistory` keeps its
 * notice as a bare string and every one of them is a refusal, so it builds the
 * object with `useMemo` for that reason.
 *
 * ## Announced, not only drawn - #111
 *
 * The banner carried no `role` and no `aria-live`. A sighted person watches it
 * appear; somebody using a screen reader gets nothing, because it is inserted
 * into a region they are not reading and nothing declares it. The button they
 * pressed does not report back at all.
 *
 * **#111 says there is no live region anywhere in `frontend/src`, and that is
 * not true** - recorded here because the evidence looked conclusive. The ticket
 * ran `grep -rn 'role="alert"\|aria-live'`, got nothing, and pasted the empty
 * result. That pattern cannot match `role="status"`, and four screens were
 * already using it for their empty-state sentences (`CloAssessment`,
 * `ContinuousImprovement`, `OutcomeActivityMapping`, `StudentResults`). The
 * banner really was silent, so the defect stands; the *nowhere in the app* half
 * was an artefact of the search. **A grep is evidence for the pattern you
 * typed, not for the claim you wanted.**
 *
 * **The assertive-or-polite judgement is made here and nowhere else**, which is
 * what #111 asks for. `role="alert"` is `aria-live="assertive"`: it interrupts
 * whatever the reader is in the middle of. That is right for a refusal the
 * person just caused by pressing a button - they are waiting for exactly this
 * answer, and it is the reason the thing they asked for did not happen.
 * `role="status"` is `aria-live="polite"`: announced, but queued behind the
 * current sentence. That is right for *saved* - worth hearing, not worth
 * cutting somebody off for.
 *
 * The component already knows which it is, because `notice.error` is the same
 * flag that picks red or green. **No caller decides this**, which is the point:
 * twenty screens each making an accessibility judgement is twenty chances to
 * make it differently.
 *
 * ## Why the region is not persistent
 *
 * The textbook live region is always in the DOM and only its contents change,
 * because a region inserted at the same moment as its text is announced less
 * reliably on some older readers. That was tried and rejected: `Notice` returns
 * `null` when there is nothing to say, and it sits inside `space-y-*` stacks on
 * 34 screens, so an always-rendered empty wrapper adds a gap to every one of
 * them. **Changing the spacing of 34 screens is not a side effect an ARIA fix
 * gets to have** - the same rule that kept `ContentMotionDIV` from taking
 * `...rest` in #85. Current NVDA, JAWS and VoiceOver all announce an inserted
 * `alert`; whether a real reader does is the half of this the browser seam
 * cannot ask, and the sheet marks it ◐.
 */
export default function Notice({ notice }) {
  const box = useRef(null)

  useEffect(() => {
    if (!notice) return
    box.current?.scrollIntoView({ block: 'nearest' })
  }, [notice])

  if (!notice) return null

  return (
    <div ref={box}>
      <ContentMotionDIV
        role={notice.error ? 'alert' : 'status'}
        className={`rounded-lg p-3 text-sm ${
          notice.error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
        }`}
      >
        {notice.message}
      </ContentMotionDIV>
    </div>
  )
}
