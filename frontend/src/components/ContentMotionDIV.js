import { motion } from 'framer-motion'
/**
 * The fade-and-slide every screen's content arrives with.
 *
 * `role` and `id` are passed through - #85. This used to accept `children` and
 * `className` and silently drop everything else, which is fine until the thing
 * being dropped is an attribute that changes what the element *is*: the
 * sign-in refusal needs `role="alert"` to be announced and an `id` for the two
 * fields to point at, and a wrapper that eats them turns a missing
 * announcement into a missing announcement nobody can see the cause of. A
 * component that renders an element should let that element be identified and
 * described.
 *
 * **Two named props rather than `...rest`, and the reason is a measurement.**
 * The first version spread everything. Four call sites already pass props that
 * this component has been dropping since it was written - `Navbar.js` passes
 * `initial`/`animate`/`exit` and a `style` on the change-password overlay,
 * `PageNotFound.js` passes its own `initial`/`animate`/`transition` twice -
 * and a spread would have made all of them live at once. That is four screens
 * changing how they arrive, inside a ticket about how long a sentence stays on
 * a fifth. **A passthrough is not a neutral act in a component with 63 call
 * sites**; it hands every caller whatever it happened to be passing into the
 * void.
 *
 * Those props stay ignored, deliberately: this component owns the animation,
 * which is the whole reason it exists rather than each screen writing its own
 * `motion.div`. Honouring them is a separate question from #85 and belongs to
 * whoever asks it - dead props on four call sites are worth tidying, but not
 * by changing what four screens look like as a side effect of an ARIA fix.
 */
function ContentMotionDIV({ children, className = '', role, id }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{
        duration: 0.18,
        ease: [0.42, 0, 0.58, 1],
      }}
      className={`${className}`}
      role={role}
      id={id}
    >
      {children}
    </motion.div>
  )
}

export default ContentMotionDIV
