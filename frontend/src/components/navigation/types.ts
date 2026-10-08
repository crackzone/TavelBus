import type { LucideIcon } from 'lucide-react'

export type NavItem = {
  label: string
  shortLabel: string
  to: string
  icon: LucideIcon
  isActive: (pathname: string) => boolean
}
