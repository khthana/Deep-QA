import React, { useCallback, useState } from 'react'
import SidebarItem from './SidebarItem'

function Sidebar({
  activePage,
  setActivePage,
  role,
  isCollapsed,
  setIsCollapsed,
}) {
  const [openMenu, setOpenMenu] = useState([])

  const handleToggleSubmenu = menu => {
    setOpenMenu(prev =>
      prev.includes(menu) ? prev.filter(k => k !== menu) : [...prev, menu]
    )
  }

  // Memoised because SidebarItem lists it among its effect's dependencies:
  // a fresh identity each render would re-run that effect each render.
  const handleClick = useCallback(
    itemKey => setActivePage(itemKey),
    [setActivePage]
  )

  return (
    <SidebarItem
      handleToggleSubmenu={handleToggleSubmenu}
      handleClick={handleClick}
      setOpenMenu={setOpenMenu}
      openMenu={openMenu}
      role={role}
      isCollapsed={isCollapsed}
      setIsCollapsed={setIsCollapsed}
    ></SidebarItem>
  )
}

export default Sidebar
