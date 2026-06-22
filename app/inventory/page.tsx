import { Suspense } from "react";
import InventoryPageClient from "./InventoryPageClient";

export default function InventoryPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-sm font-semibold text-rbx-muted">
          Loading inventory...
        </div>
      }
    >
      <InventoryPageClient />
    </Suspense>
  );
}
