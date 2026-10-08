import { PlaceholderPage } from '../pages/PlaceholderPage.tsx'
import type { ShellPage } from './shell-routes.ts'

export function placeholderRoutes(pages: readonly ShellPage[]) {
  return pages.map((page) => ({
    path: page.path,
    element: <PlaceholderPage title={page.title} description={page.description} />,
  }))
}
