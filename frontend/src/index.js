import React from 'react'
import ReactDOM from 'react-dom/client'

import './index.css'
import App from './App'
import { AuthProvider } from './context/AuthContext'

/**
 * The provider is wrapped once. The inherited entry point wrapped it here and
 * again inside App, which gave the tree two independent copies of the session
 * state, only one of which any given component read.
 */
const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)
