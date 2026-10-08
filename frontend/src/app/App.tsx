import { RouterProvider } from 'react-router-dom'
import { AppProviders } from './providers.tsx'
import { router } from './router.tsx'

export default function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  )
}
