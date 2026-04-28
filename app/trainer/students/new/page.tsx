import { StudentForm } from '@/components/trainer/student-form';

export default function NewStudentPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Add student</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          They get an invite link and join your roster on accept.
        </p>
      </div>
      <StudentForm />
    </div>
  );
}
