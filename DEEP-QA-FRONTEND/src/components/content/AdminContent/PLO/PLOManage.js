import { useState, useEffect } from 'react'
import ContentTitle from '../../../ContentTitle'
import { FaBookBookmark } from 'react-icons/fa6'
import ContentMotionDIV from '../../../ContentMotionDIV'
import SelectPrograms from '../../../SelectProgram'
import PLOtable from './PLOtable'
import usePagination from '../../../usePagination'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import SessionExpiredDialog from '../../../SessionExpiredDialog.js'
import { isSessionExpired } from '../../../../utils/session.js'

function PLOManage() {
  const [SelectedProg, setSelectedProg] = useState([])
  const [sessionExpired, setSessionExpired] = useState(false)

  const {
    page,
    setPage,
    currentData,
    totalPages,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination([], 10)

  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'success',
  })

  return (
    <ContentMotionDIV className="flex h-full flex-col rounded-xl bg-white p-8 shadow">
      <ContentTitle
        titlename={'การกำหนดผลการเรียนรู้ระดับหลักสูตร PLO'}
        icon={FaBookBookmark}
      />
      <SelectPrograms
        setSelectedProg={setSelectedProg}
        SelectedProg={SelectedProg}
        setPage={setPage}
        setSessionExpired={setSessionExpired}
        isSessionExpired={isSessionExpired}
      ></SelectPrograms>
      <PLOtable
        setAlert={setAlert}
        setSelectedProg={setSelectedProg}
        SelectedProg={SelectedProg}
        setSessionExpired={setSessionExpired}
        isSessionExpired={isSessionExpired}
      ></PLOtable>

      <Snackbar
        open={alert.open}
        autoHideDuration={3000}
        onClose={() => setAlert({ ...alert, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setAlert({ ...alert, open: false })}
          severity={alert.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>

      <SessionExpiredDialog open={sessionExpired} />
    </ContentMotionDIV>
  )
}
export default PLOManage
