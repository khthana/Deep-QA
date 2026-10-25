import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'

/**
 * `AnimatePresence`, with one addition: a child that has been taken away in a
 * tab which is not being given frames leaves the document at once, without the
 * exit animation nobody is there to watch - #169, generalised by #227.
 *
 * **Why a node can outlive its own removal.** `ContentMotionDIV` declares
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
 * opacity** in front of them.
 *
 * **Why this shape.** CSS cannot do it: a transition and an animation both
 * fail to fire `transitionend`/`animationend` in a frameless tab, measured the
 * same hour. What does still run is React's own scheduling, which is why the
 * removal commits at all, and that is what this hangs on. The remedy is to
 * mount a **new** `AnimatePresence`: the one that is holding a child it cannot
 * fade is unmounted, and what it was holding goes with it, while whatever is
 * to be drawn now mounts in the new one. Hence the generation counter and the
 * `key` - a flag that merely stopped rendering `AnimatePresence` would have to
 * come down again later, and lowering it would remount the live child in front
 * of the person.
 *
 * `at` is what names the thing currently being drawn - `'open'`/`'shut'` for a
 * dialog, which of two keys for a swap. A change to it is the only thing that
 * can start a removal, so it is the only thing that can leave a node behind,
 * and it is a required prop (`required-props.js`, #182) because a caller that
 * forgets it gets a component that silently never retires anything.
 *
 * `mode` is passed through, which is #227's other half: `pages/Login.js` swaps
 * its form for a spinner inside one presence with `mode="wait"`, and there the
 * held node is the **form on its way out** - so with no frames the spinner it
 * is waiting for never mounts at all. Measured on 25 October 2569: a sign-in
 * refused while the tab was away left the spinner in the document at
 * `opacity: 1` with its *กำลังเข้าสู่ระบบ* still in the accessibility tree,
 * and the form and the refusal **not in the document at all**, 2.5 seconds
 * after the answer had landed. That is a sentence the person is owed and
 * cannot be given, which is why this one was fixed and the other four of
 * #227's five were not: they have no way in that does not race the person's
 * own hand, and each says so on itself with the price in numbers.
 *
 * Nothing changes for anybody who is looking at the screen: while the tab has
 * frames this is `AnimatePresence` and nothing else. That is a claim, so it is
 * measured both ways - `visible` and `visible-after-hidden` for the two boxes,
 * `sites-visible` and `sites-visible-after-hidden` for the five. The second of
 * each is the one the listener's first version failed: 0 frames instead of 13,
 * which is a box disappearing in front of somebody rather than fading. It is
 * why the listener is armed only while something may be on its way out, and
 * disarmed the moment the exit completes - and, since #227, the moment `at`
 * comes back to what was leaving, which is an exit that will never complete
 * and so a flag that would never have come down. #227 failed that mode the
 * same way #169's first version did, by a different route and with the same
 * number: 0 frames instead of 13.
 *
 * **It is held by no row and no mutant**, and that is this component's own
 * price: the condition cannot be built at either test seam, for the reason
 * measured above. `e2e/probes/169-presence-without-frames.js` is the
 * instrument that can, and it is run by hand.
 */
function RetiringPresence({ at, mode, children }) {
  const [generation, setGeneration] = useState(0)
  const atBefore = useRef(at)
  const drawnBefore = useRef(children != null)
  // Which `at` the child that may still be on its way out belongs to, or
  // `null` for nothing in flight. A boolean cannot answer the second question
  // below.
  const leavingFrom = useRef(null)

  const drawn = children != null

  // The rule itself, written once because both arms below are the same rule
  // reached two ways: if something may still be on its way out and there are
  // no frames to fade it with, retire it now by mounting a fresh presence.
  // Two copies of it is how a later fix comes to repair one arm and not the
  // other, which is the species both this wrapper's first versions met (#169,
  // #227).
  const dropWhatCannotFade = useCallback(() => {
    if (document.hidden && leavingFrom.current != null) {
      leavingFrom.current = null
      setGeneration(count => count + 1)
    }
  }, [])

  useEffect(() => {
    // Only a change of `at` starts a removal, and only something that was
    // drawn before it can be left behind. The comparison is what keeps this
    // off the first render: a wrapper that armed itself on mount would have
    // the listener below remount a screen nobody had closed, every time its
    // tab went to the background - which on `pages/Login.js`, whose children
    // are never null, is the sign-in form fading in again on the way back.
    if (atBefore.current !== at) {
      if (leavingFrom.current === at) {
        // And `at` has come back to what was leaving, which means the exit was
        // reversed: that child is the live one again and `onExitComplete` will
        // never fire for it, because no exit ever completed. On
        // `pages/Login.js` this is the ordinary case rather than a corner -
        // with nothing emulated the answer landed at 79ms against the 180ms
        // the form takes to leave, so the spinner never mounts at all (#227,
        // 25 October 2569). Read as *still holding*, it left this armed for
        // ever, and the next time the tab went away the whole sign-in screen
        // was remounted under somebody who had closed nothing: 0 of 44 frames
        // drawing the refusal they were watching, where the measurement wants
        // 13.
        leavingFrom.current = null
      } else if (drawnBefore.current) {
        leavingFrom.current = atBefore.current
      }
    }
    atBefore.current = at
    drawnBefore.current = drawn
    dropWhatCannotFade()
  }, [at, drawn, dropWhatCannotFade])

  // The other half: taken away while the tab was in front, and the tab
  // backgrounded inside the 180ms the fade needs. Armed only while something
  // may be on its way out, because a listener that ran whenever the tab was
  // hidden would also remount whatever is open - which is a dialog losing what
  // somebody had typed into it, and, on the way back, a node disappearing in
  // front of them rather than fading.
  useEffect(() => {
    document.addEventListener('visibilitychange', dropWhatCannotFade)
    return () =>
      document.removeEventListener('visibilitychange', dropWhatCannotFade)
  }, [dropWhatCannotFade])

  return (
    <AnimatePresence
      key={generation}
      mode={mode}
      onExitComplete={() => {
        leavingFrom.current = null
      }}
    >
      {children}
    </AnimatePresence>
  )
}

export const REQUIRED_PROPS = ['at']

export default RetiringPresence
