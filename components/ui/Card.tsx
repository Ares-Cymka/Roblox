import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  elevated?: boolean;
  action?: ReactNode;
}

export function Card({
  children,
  className,
  title,
  description,
  elevated = false,
  action,
}: CardProps) {
  return (
    <div
      className={cn(
        elevated ? "rbx-panel-elevated" : "rbx-panel",
        "p-6",
        className
      )}
    >
      {(title || description || action) && (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {title && (
              <h2 className="text-base font-bold text-rbx-text">{title}</h2>
            )}
            {description && (
              <p className="mt-0.5 text-sm text-rbx-muted">{description}</p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
