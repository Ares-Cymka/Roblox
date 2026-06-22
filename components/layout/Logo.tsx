import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  subtitle?: string;
}

export function Logo({ className, subtitle }: LogoProps) {
  return (
    <Link href="/" className={cn("group inline-flex flex-col", className)}>
      <span className="flex items-center gap-1 text-xl font-extrabold tracking-tight">
        <span className="text-rbx-red">R</span>
        <span className="text-rbx-text group-hover:text-white">ngBlox</span>
      </span>
      {subtitle && (
        <span className="text-[11px] font-semibold uppercase tracking-widest text-rbx-dim">
          {subtitle}
        </span>
      )}
    </Link>
  );
}
