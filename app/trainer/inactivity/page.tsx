import { InactivityAlertsList } from '@/components/trainer/inactivity-alerts-list';

export default function InactivityPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Inactivity radar
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Students drifting before they ghost. Acknowledge or queue an outreach.
        </p>
      </div>
      <InactivityAlertsList />
    </div>
  );
}
