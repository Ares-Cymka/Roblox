import type { ReactNode } from "react";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export function AdminPageHeader({
  title,
  description,
  children,
}: AdminPageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-rbx-text">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-rbx-muted">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
