import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { useStore } from './store'
import './styles.css'

// Handy for debugging from devtools: rackDesigner.store.getState()
;(window as unknown as { rackDesigner: unknown }).rackDesigner = { store: useStore }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
