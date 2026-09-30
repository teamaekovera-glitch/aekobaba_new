import type { InputHTMLAttributes } from "react";

// Label + input + accessible error message. Plain (no "use client") so both
// server and client components can render it.

export function FormField({
  id,
  label,
  error,
  hint,
  ...inputProps
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className">) {
  const describedBy = [
    hint ? `${id}-hint` : null,
    error ? `${id}-error` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-stone-800"
      >
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-stone-500">
          {hint}
        </p>
      ) : null}
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`block h-10 w-full rounded-md border bg-white px-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-2 focus:outline-offset-0 focus:outline-accent ${
          error ? "border-red-400" : "border-stone-300"
        }`}
        {...inputProps}
      />
      {error ? (
        <p id={`${id}-error`} className="text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
