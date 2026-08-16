import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useUserList } from '../../../../hooks/useUserList'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'

function UserManage() {
  const Role = localStorage.getItem('selectedRole')
  const [selectedUser, setSelectedUser] = useState([])
  const { userList, fetchUserList } = useUserList(Role)
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
          userList,
          Role,
          selectedUser,
          fetchUserList,
          setSelectedUser,
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
    </div>
  )
}

export default UserManage
