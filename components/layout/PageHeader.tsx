import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-rbx-text">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-rbx-muted">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
