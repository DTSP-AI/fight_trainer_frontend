import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardSummaryTiles } from '@/components/trainer/dashboard-summary';
import { InactivityAlertsList } from '@/components/trainer/inactivity-alerts-list';

export default function TrainerDashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            What needs your attention right now.
          </p>
        </div>
        <Button asChild>
          <Link href="/trainer/sessions/new">
            <Plus className="h-4 w-4" />
            Log session
          </Link>
        </Button>
      </div>

      <DashboardSummaryTiles />

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-semibold tracking-tight">
            Inactivity radar
          </h2>
          <Link
            href="/trainer/inactivity"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View all
          </Link>
        </div>
        <InactivityAlertsList />
      </section>
    </div>
  );
}
