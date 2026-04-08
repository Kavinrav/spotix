import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log('%c [SPOTIX] App Starting... v1.0.3 %c', 'background: #1DB954; color: white; padding: 5px; font-size: 20px;', '')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
