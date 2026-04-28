import { ClipFeed } from '@/components/student/clip-feed';

export default function StudentFeedPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Your feed</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Clips and cues from your last sessions.
        </p>
      </div>
      <ClipFeed />
    </div>
  );
}
