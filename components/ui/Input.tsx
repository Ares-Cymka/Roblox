import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={inputId} className="rbx-label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "rounded-rbx border-2 border-rbx-border bg-rbx-bg px-4 py-2.5 text-sm font-medium text-rbx-text placeholder:text-rbx-dim focus:border-rbx-blue focus:outline-none focus:ring-2 focus:ring-rbx-blue/25",
          error && "border-rbx-red focus:border-rbx-red focus:ring-rbx-red/25",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs font-semibold text-rbx-red">{error}</p>}
    </div>
  );
}
