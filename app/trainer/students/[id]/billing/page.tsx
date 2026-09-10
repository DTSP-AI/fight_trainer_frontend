import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

/** Billing lives on the Client Workspace now (?tab=billing). Redirect for
 *  one release so bookmarks and emailed links keep working (D4). */
export default async function StudentBillingRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/trainer/students/${id}?tab=billing`);
}
