import React, { forwardRef } from 'react';
import { CircleAlert } from 'lucide-react';

export const inputClass =
  'h-12 w-full rounded-xl border border-field bg-white px-4 text-base text-ink outline-none ' +
  'transition-[border-color,box-shadow] duration-200 ease-calm ' +
  'hover:border-ink/70 focus:border-accent focus:ring-4 focus:ring-accent/15 ' +
  'aria-invalid:border-danger aria-invalid:focus:ring-danger/15 ' +
  'disabled:cursor-not-allowed disabled:bg-paper disabled:text-muted md:text-[15px]';

export function FieldLabel({ htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
      {children}
    </label>
  );
}

export function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} className="flex items-start gap-1.5 text-[13px] leading-5 text-danger">
      <CircleAlert aria-hidden="true" className="mt-[3px] size-3.5 shrink-0" strokeWidth={2} />
      <span>{children}</span>
    </p>
  );
}

/** Labelled text input with an associated, announced error message. */
const TextField = forwardRef(function TextField({ id, label, error, ...inputProps }, ref) {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        className={inputClass}
        {...inputProps}
      />
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
});

export default TextField;
