import { motion } from 'framer-motion'
function MotionTr({ children, className = '', onClick }) {
  return (
    <motion.tr
      initial={{ opacity: 0, y: 0, scale: 1 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 0, scale: 1 }}
      // whileHover={{ scale: 1.02 }} //
      // whileTap={{ scale: 0.98 }} //
      transition={{
        duration: 0.25,
        ease: [0.42, 0, 0.58, 1], //
      }}
      className={`${className}`}
      onClick={onClick}
    >
      {children}
    </motion.tr>
  )
}

export default MotionTr
