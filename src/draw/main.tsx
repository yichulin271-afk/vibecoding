import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import DrawApp from './DrawApp.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DrawApp />
  </StrictMode>,
)
