import { Link } from 'react-router-dom'
import { MdOutlineNavigateNext, MdHome } from 'react-icons/md'
import { motion } from 'framer-motion'

const Breadcrumb = ({ items }) => {
  return (
    <nav className="flex w-full" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1">
        {items.map((item, index) => (
          <motion.li
            key={index}
            className="inline-flex select-none items-center"
            whileHover={{ scale: 1.05, color: '#2563eb' }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {index > 0 && (
              <MdOutlineNavigateNext
                className="mx-1 h-5 w-5 text-gray-400 rtl:rotate-180"
                aria-hidden="true"
              />
            )}

            <Link
              to={item.href}
              className={`flex items-center ${
                index === 0 ? 'font-semibold text-secondary' : 'text-gray-700'
              } text-sm font-medium hover:text-secondary_hover`}
            >
              {index === 0 && (
                <MdHome
                  className="me-1 h-5 w-5 rtl:rotate-180"
                  aria-hidden="true"
                />
              )}
              {item.label}
            </Link>
          </motion.li>
        ))}
      </ol>
    </nav>
  )
}

export default Breadcrumb
