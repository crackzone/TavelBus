import { lazy, Suspense } from 'react'
import { PageSkeleton } from '../components/feedback/LoadingSkeleton.tsx'

const HomePage = lazy(() => import('./HomePage.tsx').then((module) => ({ default: module.HomePage })))

export function HomeRoute() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <HomePage />
    </Suspense>
  )
}
