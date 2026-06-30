import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

// No StrictMode: the Engine runs a single rAF loop and owns native resources,
// so we avoid the dev-only double-mount that would spin up two engines.
createRoot(document.getElementById('root')!).render(<App />)
