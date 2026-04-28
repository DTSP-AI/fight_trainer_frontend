import { StudentDetail } from '@/components/trainer/student-detail';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function StudentDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-5xl">
      <StudentDetail studentId={id} />
    </div>
  );
}
