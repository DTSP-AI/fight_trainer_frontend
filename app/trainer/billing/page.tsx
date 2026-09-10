import { redirect } from 'next/navigation';

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * The billing hub is retired (plan 2026-09-09, D4): the service catalog is
 * under Settings, packages and bookings live on each Client Workspace, and
 * the missed / re-up banners moved to the dashboard. Redirect for one
 * release so bookmarks keep working, then delete.
 */
export default async function BillingHubRedirect({ searchParams }: Props) {
  const params = await searchParams;
  const student = typeof params.student === 'string' ? params.student : null;
  if (student) {
    redirect(`/trainer/students/${encodeURIComponent(student)}?book=1`);
  }
  redirect('/trainer/students');
}
