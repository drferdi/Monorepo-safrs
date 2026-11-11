import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { FieldError, FieldLabel, inputClass } from './TextField.jsx';

/** Password input with a show/hide control and an optional action beside the label. */
const PasswordField = forwardRef(function PasswordField(
  { id, label, error, labelAction, disabled, ...inputProps },
  ref,
) {
  const [visible, setVisible] = useState(false);
  const errorId = `${id}-error`;
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {labelAction}
      </div>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={visible ? 'text' : 'password'}
          disabled={disabled}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`${inputClass} pr-12`}
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          aria-controls={id}
          className="absolute top-1 right-1 flex size-10 items-center justify-center rounded-[9px] text-muted outline-none transition-colors duration-200 ease-calm hover:text-ink focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed"
        >
          <Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
        </button>
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
});

export default PasswordField;
