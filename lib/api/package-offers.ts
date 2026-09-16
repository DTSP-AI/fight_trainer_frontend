import { apiClient } from '@/lib/api';
import type { PackageRow, PaymentMethod } from '@/lib/api/billing';

/**
 * Package offers — the coach's proposal for a client's NEXT package, sent
 * when the current one runs low. Mirrors backend/app/api/package_offers.py.
 */

export type PackageOfferStatus = 'sent' | 'accepted' | 'declined' | 'cancelled';

export interface PackageOfferRow {
  id: string;
  tenant_id: string;
  student_id: string;
  service_id: string;
  service_name?: string | null;
  source_package_id?: string | null;
  total_sessions: number;
  price_per_session_cents: number;
  total_price_cents: number;
  message?: string | null;
  status: PackageOfferStatus;
  created_package_id?: string | null;
  sent_at?: string | null;
  responded_at?: string | null;
}

export interface PackageOfferCreateRequest {
  service_id: string;
  total_sessions: number;
  price_per_session_cents: number;
  message?: string;
  source_package_id?: string;
}

export interface PackageOfferSendResult {
  offer: PackageOfferRow;
  /** Email delivery: sent | skipped (no address / no key) | failed. */
  delivery: { status: string; reason?: string; error?: string };
  /** Older open offers cancelled by this send. */
  superseded: number;
}

export interface PackageOfferAcceptResult {
  offer: PackageOfferRow;
  package: PackageRow;
}

const OFFERS = '/api/package-offers';

export const packageOffersApi = {
  /** Coach: every offer sent to this client. */
  listForStudent: (studentId: string) =>
    apiClient.get<PackageOfferRow[]>(
      `/api/students/${encodeURIComponent(studentId)}/package-offers`,
    ),
  /** Coach: send a proposal (supersedes any open one). */
  send: (studentId: string, payload: PackageOfferCreateRequest) =>
    apiClient.post<PackageOfferSendResult>(
      `/api/students/${encodeURIComponent(studentId)}/package-offers`,
      payload,
    ),
  cancel: (offerId: string) =>
    apiClient.post<PackageOfferRow>(`${OFFERS}/${encodeURIComponent(offerId)}/cancel`, {}),

  /** Client: my offers, newest first. */
  mine: () => apiClient.get<PackageOfferRow[]>('/api/student/package-offers'),
  accept: (
    offerId: string,
    payload: { mark_paid_method?: PaymentMethod; mark_paid_reference?: string } = {},
  ) =>
    apiClient.post<PackageOfferAcceptResult>(
      `${OFFERS}/${encodeURIComponent(offerId)}/accept`,
      payload,
    ),
  decline: (offerId: string) =>
    apiClient.post<PackageOfferRow>(`${OFFERS}/${encodeURIComponent(offerId)}/decline`, {}),
};
