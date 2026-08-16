import { BrowserRouter as Router } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import AppRoutes from './routes/AppRoutes'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="font-thai">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
