import type { InputHTMLAttributes } from 'react'
import { cx } from '../../lib/cx.ts'
import { Field } from './field.tsx'
import { controlClass, describedBy } from './field-styles.ts'

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  id: string
  label: string
  hint?: string
  error?: string
}

export function Input({ id, label, hint, error, required, className, ...props }: InputProps) {
  return (
    <Field htmlFor={id} label={label} hint={hint} error={error} required={required}>
      <input
        {...props}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cx(controlClass, className)}
      />
    </Field>
  )
}
