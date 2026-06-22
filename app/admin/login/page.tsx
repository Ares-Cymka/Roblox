import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4">
      <Suspense
        fallback={
          <p className="text-sm text-gray-600">Loading...</p>
        }
      >
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
