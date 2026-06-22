import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

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
    <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in with your admin credentials.
          </p>
        </div>

        {error && <Alert>{error}</Alert>}

        <Card>
          <form
            method="POST"
            action="/api/admin/login"
            className="space-y-4"
          >
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
            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-gray-500">
          After sign in you will be redirected to the admin bots page.
        </p>
      </div>
    </div>
  );
}
