import { useState, useMemo, useEffect } from 'react'

function usePagination(data, rowsPerPage = 10) {
  const [page, setPage] = useState(1)

  // useEffect(() => {
  //   setPage(1)
  // }, [data])

  const totalItems = data.length
  const totalPages = Math.ceil(totalItems / rowsPerPage)

  const startIndex = (page - 1) * rowsPerPage
  const endIndex = Math.min(startIndex + rowsPerPage, totalItems)

  const currentData = useMemo(
    () => data.slice(startIndex, endIndex),
    [data, startIndex, endIndex]
  )

  return {
    page,
    setPage,
    currentData,
    totalPages,
    startIndex,
    endIndex,
    totalItems,
  }
}

export default usePagination
