import { motion } from 'framer-motion'
function ContentMotionDIV({ children, className = '' }) {
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
    >
      {children}
    </motion.div>
  )
}

export default ContentMotionDIV
