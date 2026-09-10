import { redirect } from 'next/navigation';

/** The static sessions hub is retired (plan 2026-09-09, D4). Sessions are
 *  logged from a client's workspace; /trainer/sessions/new and
 *  /trainer/sessions/[id] stay. */
export default function SessionsHubRedirect() {
  redirect('/trainer/students');
}
