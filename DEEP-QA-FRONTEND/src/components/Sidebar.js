import React, { useState } from 'react'
import SidebarItem from './SidebarItem'

function Sidebar({
  activePage,
  setActivePage,
  selectedRole,
  isCollapsed,
  setIsCollapsed,
}) {
  const [openMenu, setOpenMenu] = useState([])

  const handleToggleSubmenu = menu => {
    setOpenMenu(prev =>
      prev.includes(menu) ? prev.filter(k => k !== menu) : [...prev, menu]
    )
  }

  const handleClick = itemKey => {
    setActivePage(itemKey)
  }

  return (
    <SidebarItem
      handleToggleSubmenu={handleToggleSubmenu}
      handleClick={handleClick}
      setOpenMenu={setOpenMenu}
      openMenu={openMenu}
      selectedRole={selectedRole}
      isCollapsed={isCollapsed}
      setIsCollapsed={setIsCollapsed}
    ></SidebarItem>
  )
}

export default Sidebar
