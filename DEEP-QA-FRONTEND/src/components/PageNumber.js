import Pagination from '@mui/material/Pagination'
function PageNumber({
  startIndex,
  endIndex,
  page,
  setPage,
  totalItems,
  totalPages,
}) {
  return (
    <div className="inline-flex items-center justify-between py-4">
      {/* <span className="text-gray-500">
        {startIndex + 1}–{endIndex} of {totalItems} items
      </span> */}
      <span className="text-gray-500">
        {endIndex} of {totalItems} items
      </span>
      <Pagination
        count={totalPages}
        page={page}
        onChange={(e, value) => setPage(value)}
        variant="outlined"
        shape="rounded"
        showFirstButton
        showLastButton
        color="primary"
      />
    </div>
  )
}

export default PageNumber
