import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudentList } from '@/components/trainer/student-list';

export default function TrainerStudentsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Students</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Roster, last-seen, and risk flags.
          </p>
        </div>
        <Button asChild>
          <Link href="/trainer/students/new">
            <Plus className="h-4 w-4" />
            Add student
          </Link>
        </Button>
      </div>
      <StudentList />
    </div>
  );
}
