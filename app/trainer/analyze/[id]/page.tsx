'use client';

import { useParams } from 'next/navigation';
import { AnalysisDetail } from '@/components/analysis/analysis-detail';

export default function AnalysisDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? '');
  return <AnalysisDetail analysisId={id} backHref="/trainer/analyze" />;
}
