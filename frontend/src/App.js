import { BrowserRouter as Router } from 'react-router-dom'

import AppRoutes from './routes/AppRoutes'
import SessionExpiredDialog from './components/SessionExpiredDialog'
import { useAuth } from './context/AuthContext'

function App() {
  const { expired } = useAuth()

  return (
    <Router>
      <div className="font-thai">
        <AppRoutes />
        {/* The sixth criterion: an idle session ends with an explanation, once,
            wherever in the application the request that found it was made. */}
        <SessionExpiredDialog open={expired} />
      </div>
    </Router>
  )
}

export default App
