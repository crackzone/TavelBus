export const controlClass =
  'focus-ring min-h-11 w-full rounded-sm border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted disabled:bg-canvas disabled:text-muted'

export function describedBy(id: string, hint?: string, error?: string): string | undefined {
  const ids: string[] = []
  if (hint) ids.push(`${id}-hint`)
  if (error) ids.push(`${id}-error`)
  return ids.length > 0 ? ids.join(' ') : undefined
}
