import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cx } from '../../lib/cx.ts'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse' | 'inverse-ghost'
type Size = 'sm' | 'md' | 'lg'

const variantClass: Record<Variant, string> = {
  primary: 'bg-navy text-white hover:bg-navy-soft',
  secondary: 'border border-line bg-surface text-ink hover:bg-canvas',
  ghost: 'bg-transparent text-ink hover:bg-canvas',
  danger: 'bg-danger text-white hover:bg-danger-strong',
  inverse: 'bg-white text-navy hover:bg-canvas',
  'inverse-ghost': 'border border-white/30 bg-transparent text-white hover:bg-white/10',
}

const sizeClass: Record<Size, string> = {
  sm: 'min-h-11 px-3 text-sm',
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-12 px-5 text-base',
}

function buttonClasses(variant: Variant, size: Size, className?: string): string {
  return cx(
    variant === 'inverse-ghost' ? 'focus-ring-light' : 'focus-ring',
    'inline-flex items-center justify-center gap-2 rounded-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
    variantClass[variant],
    sizeClass[size],
    className,
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? <span className="size-2 rounded-full bg-current motion-safe:animate-pulse" aria-hidden="true" /> : null}
      {children}
      {loading ? <span className="sr-only"> Working</span> : null}
    </button>
  )
}

type ButtonLinkProps = Omit<LinkProps, 'className'> & {
  variant?: Variant
  size?: Size
  className?: string
}

export function ButtonLink({ variant = 'primary', size = 'md', className, ...props }: ButtonLinkProps) {
  return <Link {...props} className={buttonClasses(variant, size, className)} />
}
