"use client";

import { useId, useState, type Ref } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordFieldProps = {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  autoComplete?: "new-password" | "current-password";
  placeholder?: string;
  minLength?: number;
  required?: boolean;
  describedBy?: string;
  invalid?: boolean;
  hint?: string;
  inputRef?: Ref<HTMLInputElement>;
};

export function PasswordField({
  id: idProp,
  label,
  value,
  onChange,
  onBlur,
  autoComplete = "new-password",
  placeholder = "Your password",
  minLength,
  required = true,
  describedBy,
  invalid,
  hint,
  inputRef,
}: PasswordFieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedByIds = [describedBy, hintId].filter(Boolean).join(" ") || undefined;
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="landing-kicker ml-1 text-zinc-500">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={invalid || undefined}
          aria-describedby={describedByIds}
          className="input-field bg-white py-4 pr-12"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="focus-ring tap-target absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-zinc-500 transition-colors duration-200 hover:text-[color:var(--foreground)]"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? (
            <EyeOff className="h-5 w-5" aria-hidden />
          ) : (
            <Eye className="h-5 w-5" aria-hidden />
          )}
        </button>
      </div>
      {hint ? (
        <p id={hintId} className="ml-1 text-xs text-zinc-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
