import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'

/**
 * `AnimatePresence` for a dialog, with one addition: a box closed in a tab
 * that is not being given frames leaves the document at once, without the
 * exit animation nobody is there to watch - #169.
 *
 * **Why a box can outlive its own close.** `ContentMotionDIV` declares
 * `exit={{ opacity: 0, y: -4 }}` with a 0.18 second tween, and framer-motion
 * drives a tween from `requestAnimationFrame`. A backgrounded tab is given no
 * frames at all, so the tween never starts, never finishes, and
 * `AnimatePresence` goes on holding a child it cannot finish retiring.
 *
 * Measured in a real Chrome on 21 October 2569, through raw CDP because the
 * test driver suppresses the condition (a backgrounded Playwright page still
 * reports `visibilityState: "visible"` and counts 60 frames a second). In a
 * genuinely backgrounded tab - `hidden`, 0 frames in a second - the closed box
 * was still in the document at 0.5, 1 and 3 seconds, at **`opacity: 1`**: not
 * a faded ghost, but the whole box, `pointer-events: auto`, every control
 * still focusable, and the subtree still in the accessibility tree (23 nodes
 * for the photo box, 35 for the change-password box). And it is not retired
 * silently when the person comes back: the tween starts on the first frame the
 * tab is given, so the box they already closed is **drawn again at full
 * opacity and fades out over ~190ms** in front of them.
 *
 * The way in is not a race with the person's own hand. Both navbar boxes close
 * themselves *after* an awaited request - the photo box through `onSaved`, the
 * change-password box through `closeChangePassword` - so pressing save and
 * switching away while the request is out lands the close in a tab that
 * already has no frames.
 *
 * **Why this shape.** CSS cannot do it: a transition and an animation both
 * fail to fire `transitionend`/`animationend` in a frameless tab, measured the
 * same hour. What does still run is React's own scheduling, which is why the
 * close commits at all, and that is what this hangs on: when the state goes
 * false while `document.hidden`, the child is dropped on the commit after,
 * with no `AnimatePresence` around it to hold. The listener covers the other
 * half - a box closed while the tab is in front, and the tab backgrounded
 * inside the 180ms the fade needs.
 *
 * Nothing changes for anybody who is looking at the screen: while the tab has
 * frames this is `AnimatePresence` and nothing else. That is a claim, so it is
 * measured both ways - `visible` and `visible-after-hidden`, two modes of the
 * probe named at the end of this comment.
 * The second is the one the listener's first version failed: 0 frames instead of
 * 13, which is a box disappearing in front of somebody rather than fading.
 *
 * **It is held by no row and no mutant**, and that is this component's own
 * price: the condition cannot be built at the browser seam, for the reason
 * measured above. `e2e/probes/169-presence-without-frames.js` is the
 * instrument that can, and it is run by hand.
 */
function DialogPresence({ show, children }) {
  const [retireWithoutFrames, setRetireWithoutFrames] = useState(false)

  useEffect(() => {
    if (show) {
      setRetireWithoutFrames(false)
      return
    }
    if (document.hidden) setRetireWithoutFrames(true)
  }, [show])

  // Only while the box is on its way out. A listener that ran whenever the tab
  // was hidden would put the flag up behind an **open** box, and then a close
  // in front of the person - minutes later, with the tab back in focus - would
  // drop the node with no fade. That is a change to what somebody is looking
  // at, which is the one thing this component may not do.
  useEffect(() => {
    if (show) return undefined
    const dropWhatCannotFade = () => {
      if (document.hidden) setRetireWithoutFrames(true)
    }
    document.addEventListener('visibilitychange', dropWhatCannotFade)
    return () =>
      document.removeEventListener('visibilitychange', dropWhatCannotFade)
  }, [show])

  // Read `show` first: a reopen is an ordinary mount inside `AnimatePresence`,
  // whatever the flag above still says, and the effect puts the flag down.
  if (!show && retireWithoutFrames) return null

  return <AnimatePresence>{show ? children : null}</AnimatePresence>
}

export default DialogPresence
