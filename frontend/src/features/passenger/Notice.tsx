export function Notice({ message, tone = 'info' }: { message: string; tone?: 'info' | 'success' }) {
  const border = tone === 'success' ? 'border-success bg-success-soft' : 'border-line bg-surface'
  return (
    <p role="status" className={`border px-3 py-3 text-sm text-ink ${border}`}>
      {message}
    </p>
  )
}
