import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Logo } from "@/components/layout/Logo";

export const dynamic = "force-dynamic";

interface AdminLoginPageProps {
  searchParams: {
    error?: string;
    from?: string;
  };
}

function resolveRedirectPath(from?: string): string {
  if (from?.startsWith("/admin") && from !== "/admin/login") {
    return from;
  }
  return "/admin/bots";
}

export default function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const error = searchParams.error
    ? decodeURIComponent(searchParams.error.replace(/\+/g, " "))
    : null;
  const from = resolveRedirectPath(searchParams.from);

  return (
    <div className="flex min-h-screen items-center justify-center bg-rbx-bg px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <Logo subtitle="Admin Login" />
          </div>
          <p className="text-sm text-rbx-muted">
            Sign in with your admin credentials.
          </p>
        </div>

        {error && <Alert>{error}</Alert>}

        <Card elevated>
          <form method="POST" action="/api/admin/login" className="space-y-4">
            <input type="hidden" name="from" value={from} />

            <Input
              label="Email"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
            <Input
              label="Password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
            <Button type="submit" className="w-full" size="lg">
              Sign In
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-rbx-dim">
          After sign in you will be redirected to the admin dashboard.
        </p>
      </div>
    </div>
  );
}
