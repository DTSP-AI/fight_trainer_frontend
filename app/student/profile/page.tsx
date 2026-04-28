import { ProfileView } from '@/components/student/profile-view';

export default function StudentProfilePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What your coach knows about you in the system.
        </p>
      </div>
      <ProfileView />
    </div>
  );
}
