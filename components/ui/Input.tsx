import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-bold uppercase tracking-wider text-rbx-muted"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "w-full rounded-rbx border border-rbx-border bg-rbx-surface px-3 py-2.5 text-sm text-rbx-text",
          "placeholder:text-rbx-dim shadow-rbx-inset",
          "focus:border-rbx-blue focus:outline-none focus:ring-2 focus:ring-rbx-blue/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-rbx-red focus:border-rbx-red focus:ring-rbx-red/20",
          className
        )}
        {...props}
      />
      {hint && !error && <p className="text-xs text-rbx-muted">{hint}</p>}
      {error && <p className="text-xs font-semibold text-rbx-red">{error}</p>}
    </div>
  );
}
