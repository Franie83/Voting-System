import React from 'react'
import ReactDOM from 'react-dom/client'
// Remove BrowserRouter import - already in App.jsx
import { QueryClient, QueryClientProvider } from 'react-query'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* BrowserRouter removed - App.jsx has its own BrowserRouter */}
      <App />
      <Toaster position="top-right" />
    </QueryClientProvider>
  </React.StrictMode>,
)