import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { CryptoProvider } from './hooks/useCrypto.tsx'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <CryptoProvider>
        <App />
      </CryptoProvider>
    </QueryClientProvider>
  </StrictMode>,
)
