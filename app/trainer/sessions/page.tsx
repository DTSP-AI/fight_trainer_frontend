import Link from 'next/link';
import { Plus, Users, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Session history is owned per-student in the backend (no flat list endpoint).
 * This page is the action hub: log a new session, or jump into a student's
 * detail page where their session history lives.
 */
export default function TrainerSessionsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Sessions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Log a session to fire the pipeline. History lives per student.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-5 w-5 text-primary" />
              Log a session
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              30 seconds in. The pipeline matches the technique against the
              canonical fight library and delivers the clip + your cue to the
              student in under 90 seconds.
            </p>
            <Button asChild>
              <Link href="/trainer/sessions/new">
                Log session
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              History per student
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Open a student to see their last sessions, the cues you wrote,
              and clip delivery status.
            </p>
            <Button asChild variant="outline">
              <Link href="/trainer/students">
                <Users className="h-4 w-4" />
                Open roster
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Film className="h-4 w-4 text-muted-foreground" />
            Status reference
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <span className="text-foreground">queued</span> — accepted, waiting
              for the pipeline.
            </li>
            <li>
              <span className="text-foreground">processing</span> — pipeline
              matching technique → fight library.
            </li>
            <li>
              <span className="text-foreground">delivered</span> — clip + cue in
              the student&apos;s portal.
            </li>
            <li>
              <span className="text-foreground">failed</span> — pipeline blocked,
              you can reprocess from the session detail page.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
