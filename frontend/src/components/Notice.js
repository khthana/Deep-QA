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
 * ## Why the effect is keyed on the message and not on the notice
 *
 * #91's flow sets `notice` to `null` and then to a fresh object, so an effect
 * keyed on the object would also re-fire on a parent re-render that changed
 * nothing — pulling the page back up under someone who had scrolled down to
 * read the table beneath a banner that is still true. The two strings are what
 * "a new thing to say" actually means here.
 *
 * ## The shape
 *
 * `{ message, error }`, as all six screens already held it. `UserHistory` keeps
 * its notice as a bare string and every one of them is a refusal, so it builds
 * the object at the call site; a new object each render costs nothing, because
 * of the paragraph above.
 */
export default function Notice({ notice }) {
  const box = useRef(null)
  const message = notice?.message ?? null
  const error = Boolean(notice?.error)

  useEffect(() => {
    if (message === null) return
    box.current?.scrollIntoView({ block: 'nearest' })
  }, [message, error])

  if (!notice) return null

  return (
    <div ref={box}>
      <ContentMotionDIV
        className={`rounded-lg p-3 text-sm ${
          error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
        }`}
      >
        {message}
      </ContentMotionDIV>
    </div>
  )
}
