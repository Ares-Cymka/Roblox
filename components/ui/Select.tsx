import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

export function Select({
  label,
  error,
  options,
  className,
  id,
  ...props
}: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={selectId} className="rbx-label">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          "rounded-rbx border-2 border-rbx-border bg-rbx-bg px-4 py-2.5 text-sm font-medium text-rbx-text focus:border-rbx-blue focus:outline-none focus:ring-2 focus:ring-rbx-blue/25",
          error && "border-rbx-red",
          className
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-rbx-surface">
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs font-semibold text-rbx-red">{error}</p>}
    </div>
  );
}
