import { SessionDetail } from '@/components/trainer/session-detail';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SessionDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-5xl">
      <SessionDetail sessionId={id} />
    </div>
  );
}
