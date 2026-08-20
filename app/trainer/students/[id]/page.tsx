import { StudentDetail } from '@/components/trainer/student-detail';
import { StudentIntakePanel } from '@/components/trainer/student-intake-panel';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function StudentDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <StudentDetail studentId={id} />
      <StudentIntakePanel studentId={id} />
    </div>
  );
}
