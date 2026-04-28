import { SessionHistoryList } from '@/components/student/session-history-list';

export default function StudentHistoryPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">History</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every session your coach has logged for you.
        </p>
      </div>
      <SessionHistoryList />
    </div>
  );
}
