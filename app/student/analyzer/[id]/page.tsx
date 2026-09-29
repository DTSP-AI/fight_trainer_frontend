'use client';

import { useParams } from 'next/navigation';
import { AnalysisDetail } from '@/components/analysis/analysis-detail';

/**
 * Student-side detail. The backend already scopes GET /api/analysis/{id}
 * and the chat routes to the student's own rows; this route exists so the
 * student layout's RoleGate doesn't bounce them off /trainer/analyze/[id].
 */
export default function StudentAnalysisDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? '');
  return <AnalysisDetail analysisId={id} backHref="/student/analyzer" />;
}
