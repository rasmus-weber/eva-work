import React from 'react'
import ReactDOM from 'react-dom/client'
import { ToastProvider } from '@economic/taco'
import './index.css'
import './eva.css'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>,
)
