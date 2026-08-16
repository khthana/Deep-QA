import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import SessionExpiredDialog from '../../../SessionExpiredDialog.js'
import { isSessionExpired } from '../../../../utils/session.js'

function RubricManage() {
  const [selectedRubric, setSelectedRubric] = useState(null)
  const [SelectedProg, setSelectedProg] = useState([])
  const [sessionExpired, setSessionExpired] = useState(false)
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'success',
  })
  return (
    <div>
      <Outlet
        context={{
          setAlert,
          setSelectedRubric,
          selectedRubric,
          setSelectedProg,
          SelectedProg,
          setSessionExpired,
          isSessionExpired,
        }}
      />
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
    </div>
  )
}
export default RubricManage
