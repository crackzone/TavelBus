import type { SelectHTMLAttributes } from 'react'
import { cx } from '../../lib/cx.ts'
import { Field } from './field.tsx'
import { controlClass, describedBy } from './field-styles.ts'

export type SelectOption = {
  value: string
  label: string
  disabled?: boolean
}

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & {
  id: string
  label: string
  options: readonly SelectOption[]
  hint?: string
  error?: string
  placeholder?: string
}

export function Select({ id, label, options, hint, error, placeholder, required, className, ...props }: SelectProps) {
  return (
    <Field htmlFor={id} label={label} hint={hint} error={error} required={required}>
      <select
        {...props}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cx(controlClass, className)}
      >
        {placeholder ? (
          <option value="" disabled={required}>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  )
}
