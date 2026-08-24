'use client';

import { ProfileView } from '@/components/student/profile-view';

export default function StudentProfilePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What your coach has on file. Ask them to update anything that's off.
        </p>
      </div>
      <ProfileView />
    </div>
  );
}
