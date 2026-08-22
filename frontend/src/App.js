import { BrowserRouter as Router } from 'react-router-dom'

import AppRoutes from './routes/AppRoutes'
import SessionExpiredDialog from './components/SessionExpiredDialog'
import { useAuth } from './context/AuthContext'

function App() {
  const { expired, logout } = useAuth()

  return (
    <Router>
      <div className="font-thai">
        <AppRoutes />
        {/* The sixth criterion: an idle session ends with an explanation, once,
            wherever in the application the request that found it was made.

            The button signs out rather than reloading (#92). The cookie
            outlives the dead token inside it, so a reload finds the same
            expired session and draws the same dialog again; `logout` is what
            erases the cookie, and it tolerates the server having forgotten the
            session already. The dialog stays ignorant of all that. */}
        <SessionExpiredDialog open={expired} onSignIn={logout} />
      </div>
    </Router>
  )
}

export default App
