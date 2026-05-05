"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type CustomSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type CustomSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  buttonClassName?: string;
  listClassName?: string;
};

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  disabled = false,
  buttonClassName,
  listClassName,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`focus-ring inline-flex w-full items-center justify-between gap-2 text-left text-sm font-medium ${buttonClassName ?? "rounded-xl border border-black/10 bg-white px-4 py-3 text-zinc-900"}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span
          className={`min-w-0 flex-1 truncate ${selected ? "text-zinc-900" : "text-zinc-500"}`}
        >
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          className={
            listClassName ??
            "absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-black/10 bg-white p-1 shadow-[0_18px_40px_-22px_rgba(23,20,18,0.45)]"
          }
        >
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                disabled={option.disabled}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                  option.value === value
                    ? "bg-[#eaf7df] text-[#356d30]"
                    : "text-zinc-800 hover:bg-[#f7f3e9]"
                } ${option.disabled ? "cursor-not-allowed opacity-40" : ""}`}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
