import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  elevated?: boolean;
}

export function Card({
  children,
  className,
  title,
  description,
  elevated = false,
}: CardProps) {
  return (
    <div
      className={cn(
        elevated ? "rbx-panel-elevated" : "rbx-panel",
        "p-6",
        className
      )}
    >
      {(title || description) && (
        <div className="mb-5">
          {title && (
            <h2 className="text-lg font-bold text-rbx-text">{title}</h2>
          )}
          {description && (
            <p className="mt-1 text-sm text-rbx-muted">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
