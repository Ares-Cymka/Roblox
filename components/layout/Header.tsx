import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-white/40 bg-white/50 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-bold text-gray-900">
          RngBlox Delivery
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/claim"
            className="font-medium text-gray-600 hover:text-brand-secondary"
          >
            Claim
          </Link>
          <Link
            href="/admin/login"
            className="font-medium text-gray-600 hover:text-brand-secondary"
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
