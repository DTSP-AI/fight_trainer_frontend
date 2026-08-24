'use client';

import { ClipFeed } from '@/components/student/clip-feed';

export default function StudentFeedPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Feed</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Clips your coach sent after class — watch the technique, then drill it.
        </p>
      </div>
      <ClipFeed />
    </div>
  );
}
