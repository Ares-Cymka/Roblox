import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  return (
    <PageShell>
      <div className="relative overflow-hidden rounded-2xl border border-rbx-border bg-rbx-surface shadow-rbx-card">
        <div className="absolute inset-0 bg-gradient-to-br from-rbx-blue/10 via-transparent to-rbx-green/10" />
        <div className="relative px-6 py-14 sm:px-10 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-rbx-blue">
            RNGBLOX Delivery System
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold leading-tight text-rbx-text sm:text-5xl">
            Withdraw your winnings. Get items delivered in-game.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-rbx-muted">
            Manage your RNGBLOX inventory, start a withdrawal, and follow
            game-specific delivery steps with an assigned bot account.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/inventory">
              <Button size="lg">Open Inventory</Button>
            </Link>
            <Link href="/claim">
              <Button size="lg" variant="secondary">
                Claim Code
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card title="Inventory" elevated>
          <p className="text-sm text-rbx-muted">
            View items won on RNGBLOX and withdraw them for Roblox delivery.
          </p>
          <Link href="/inventory" className="mt-4 inline-block">
            <Button variant="outline" size="sm">
              Go to Inventory
            </Button>
          </Link>
        </Card>
        <Card title="Withdrawal" elevated>
          <p className="text-sm text-rbx-muted">
            Link your Roblox username and queue delivery with fraud protection.
          </p>
          <Link href="/inventory" className="mt-4 inline-block">
            <Button variant="outline" size="sm">
              Start Withdrawal
            </Button>
          </Link>
        </Card>
        <Card title="Claim Code" elevated>
          <p className="text-sm text-rbx-muted">
            Legacy direct claim flow for test orders and claim codes.
          </p>
          <Link href="/claim" className="mt-4 inline-block">
            <Button variant="outline" size="sm">
              Enter Claim Code
            </Button>
          </Link>
        </Card>
      </div>
    </PageShell>
  );
}
