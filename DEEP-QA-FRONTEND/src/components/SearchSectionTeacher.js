import { FaSearch } from 'react-icons/fa'
import { IoMdAdd } from 'react-icons/io'
import { LuImport } from 'react-icons/lu'

function SearchSectionTeacher({
  onSearch,
  onCleckImport,
  onCleckAdd,
  textImportBT = 'ข้อมูล',
  textAddBT = 'ข้อมูล',
  searchText = 'ค้นหา',
  isDisable = false,
  showImport = true,
  showAdd = true,
}) {
  return (
    <div className="inline-flex items-center justify-between py-4">
      <form>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
            <FaSearch className="text-gray-500" />
          </div>
          <input
            type="search"
            id="search"
            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 ps-10 text-sm text-gray-900 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={searchText}
            onChange={e => onSearch(e.target.value)}
          />
        </div>
      </form>

      <div className="flex flex-row gap-2">
        {showImport && (
          <button
            onClick={() => onCleckImport()}
            type="button"
            disabled={isDisable}
            className={`flex items-center justify-center rounded-lg px-5 py-2.5 text-center font-medium text-white ${
              isDisable
                ? 'cursor-not-allowed bg-gray-400'
                : 'bg-cyan-600 hover:bg-cyan-700'
            }`}
          >
            <LuImport className="me-2 h-5 w-5" />
            นำเข้า{textImportBT}
          </button>
        )}

        {showAdd && (
          <button
            onClick={() => onCleckAdd()}
            type="button"
            disabled={isDisable}
            className={`flex items-center justify-center rounded-lg px-5 py-2.5 font-medium text-white ${
              isDisable
                ? 'cursor-not-allowed bg-gray-400'
                : 'bg-secondary hover:bg-secondary_hover'
            }`}
          >
            <IoMdAdd className="me-2 h-5 w-5" />
            เพิ่ม{textAddBT}
          </button>
        )}
      </div>
    </div>
  )
}

export default SearchSectionTeacher
