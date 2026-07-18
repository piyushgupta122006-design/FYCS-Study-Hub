import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter as Router } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AppProvider } from './context/AppContext'
import { ThemeProvider } from './context/ThemeContext'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// 🔑 vite-plugin-pwa's build step generates a service worker + a Workbox
// precache manifest (the actual JS/CSS/HTML file list to cache), but it
// does NOT auto-register that service worker in the browser — the app has
// to explicitly opt in. Without this import, the SW that DevTools showed
// as "registered" was doing nothing: it had activated but never received
// a precache manifest to install, which is why Cache Storage was empty and
// every load (fast or slow network) fetched from the network fresh.
//
// `virtual:pwa-register` is a module vite-plugin-pwa injects at build
// time; it doesn't exist as a real file, so don't try to open/edit it.
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AppProvider>
          <Router>
            <App />
          </Router>
        </AppProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
