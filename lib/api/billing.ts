import { apiClient } from '@/lib/api';

// ============================================================================
// Tenant settings (payment handles + brand)
// ============================================================================

export interface TenantSettings {
  id: string;
  name: string;
  primary_sport: string;
  venmo_handle?: string | null;
  venmo_display_name?: string | null;
  zelle_phone?: string | null;
  zelle_email?: string | null;
  zelle_display_name?: string | null;
  payment_instructions?: string | null;
  stripe_account_mode?: string | null;
  gcal_calendar_id?: string | null;
}

export interface TenantSettingsUpdate {
  name?: string;
  venmo_handle?: string;
  venmo_display_name?: string;
  zelle_phone?: string;
  zelle_email?: string;
  zelle_display_name?: string;
  payment_instructions?: string;
}

// ============================================================================
// Services catalog
// ============================================================================

export type Sport =
  | 'bjj' | 'mma' | 'muay_thai' | 'boxing' | 'wrestling' | 'kickboxing';

export interface ServiceRow {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  sport: Sport;
  default_duration_minutes: number;
  default_price_cents: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceCreateRequest {
  name: string;
  description?: string;
  sport: Sport;
  default_duration_minutes: number;
  default_price_cents: number;
}

export interface ServiceUpdateRequest {
  name?: string;
  description?: string;
  sport?: Sport;
  default_duration_minutes?: number;
  default_price_cents?: number;
  is_active?: boolean;
}

export interface ScheduledSessionUpdateRequest {
  scheduled_for?: string;
  duration_minutes?: number;
  status?: ScheduleStatus;
  notes?: string;
  cancellation_reason?: string;
}

// ============================================================================
// Student packages
// ============================================================================

export type PackageStatus =
  | 'active' | 'paused' | 'expired' | 'completed' | 'cancelled';
export type PaymentStatus =
  | 'pending' | 'paid' | 'partial' | 'refunded' | 'failed' | 'cancelled';
export type PaymentMethod =
  | 'stripe' | 'venmo' | 'zelle' | 'cash' | 'other';

export interface PackageRow {
  id: string;
  tenant_id: string;
  student_id: string;
  service_id: string;
  total_sessions: number;
  sessions_remaining: number;
  price_per_session_cents: number;
  total_price_cents: number;
  amount_paid_cents: number;
  status: PackageStatus;
  payment_status: PaymentStatus;
  purchased_at?: string | null;
  expires_at?: string | null;
  notes?: string | null;
}

export interface PackageCreateRequest {
  student_id: string;
  service_id: string;
  total_sessions: number;
  price_per_session_cents: number;
  notes?: string;
  expires_at?: string;
  mark_paid_method?: PaymentMethod;
  mark_paid_reference?: string;
}

// ============================================================================
// Invoices
// ============================================================================

export type InvoiceStatus =
  | 'draft' | 'sent' | 'viewed' | 'paid' | 'partial' | 'overdue' | 'cancelled';

export interface InvoiceRow {
  id: string;
  tenant_id: string;
  student_id: string;
  public_token: string;
  invoice_number?: string | null;
  description: string;
  amount_cents: number;
  amount_paid_cents: number;
  currency: string;
  due_date?: string | null;
  status: InvoiceStatus;
  payment_methods_shown?: string[];
  sent_at?: string | null;
  viewed_at?: string | null;
  paid_at?: string | null;
  cancelled_at?: string | null;
  notes?: string | null;
  package_id?: string | null;
  scheduled_session_id?: string | null;
  public_url?: string;
  created_at?: string;
}

export interface InvoiceCreateRequest {
  student_id: string;
  description: string;
  amount_cents: number;
  package_id?: string;
  scheduled_session_id?: string;
  due_date?: string;
  notes?: string;
  invoice_number?: string;
  payment_methods_shown?: string[];
}

export interface InvoicePublicPayload {
  invoice: {
    id: string;
    invoice_number?: string | null;
    description: string;
    amount_cents: number;
    amount_paid_cents: number;
    amount_due_cents: number;
    currency: string;
    due_date?: string | null;
    status: InvoiceStatus;
    notes?: string | null;
  };
  student: { name?: string | null; email?: string | null };
  trainer: { tenant_name?: string | null; payment_instructions?: string | null };
  payment_methods: {
    venmo?: { web_url: string; app_url: string; handle: string } | null;
    zelle?: {
      phone?: string | null;
      email?: string | null;
      display_name?: string | null;
      amount_dollars: string;
      tel_href?: string | null;
    } | null;
  };
}

export interface SendNotificationResult {
  status: 'sent' | 'skipped' | 'failed';
  notification_id?: string | null;
  external_id?: string | null;
  error?: string | null;
}

// ============================================================================
// Scheduled sessions
// ============================================================================

export type ScheduleStatus =
  | 'scheduled' | 'confirmed' | 'completed' | 'no_show' | 'cancelled';

export interface ScheduledSessionRow {
  id: string;
  tenant_id: string;
  student_id: string;
  service_id: string;
  package_id?: string | null;
  scheduled_for: string;
  duration_minutes: number;
  price_cents: number;
  status: ScheduleStatus;
  notes?: string | null;
  confirmed_by_student_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  fulfilled_session_id?: string | null;
  gcal_event_id?: string | null;
}

export interface ScheduledSessionCreateRequest {
  student_id: string;
  service_id: string;
  package_id?: string;
  scheduled_for: string;
  duration_minutes: number;
  price_cents: number;
  notes?: string;
}

// ============================================================================
// API client
// ============================================================================

export const billingApi = {
  // tenant settings
  getTenantSettings: () => apiClient.get<TenantSettings>('/api/tenant/settings'),
  updateTenantSettings: (payload: TenantSettingsUpdate) =>
    apiClient.patch<TenantSettings>('/api/tenant/settings', payload),

  // services
  listServices: (includeInactive = false) =>
    apiClient.get<ServiceRow[]>(
      `/api/services${includeInactive ? '?include_inactive=true' : ''}`,
    ),
  createService: (payload: ServiceCreateRequest) =>
    apiClient.post<ServiceRow>('/api/services', payload),
  updateService: (serviceId: string, payload: ServiceUpdateRequest) =>
    apiClient.patch<ServiceRow>(
      `/api/services/${encodeURIComponent(serviceId)}`,
      payload,
    ),
  deleteService: (serviceId: string) =>
    apiClient.delete<{ deleted: boolean; id: string }>(
      `/api/services/${encodeURIComponent(serviceId)}`,
    ),

  // packages
  listAllPackages: (status?: PackageStatus) =>
    apiClient.get<PackageRow[]>(
      `/api/packages${status ? `?status=${status}` : ''}`,
    ),
  listPackages: (studentId: string) =>
    apiClient.get<PackageRow[]>(
      `/api/students/${encodeURIComponent(studentId)}/packages`,
    ),
  createPackage: (studentId: string, payload: PackageCreateRequest) =>
    apiClient.post<PackageRow>(
      `/api/students/${encodeURIComponent(studentId)}/packages`,
      payload,
    ),
  deletePackage: (packageId: string) =>
    apiClient.delete<{ deleted: boolean; id: string }>(
      `/api/packages/${encodeURIComponent(packageId)}`,
    ),
  recordManualPayment: (
    packageId: string,
    payload: {
      amount_cents: number;
      method: PaymentMethod;
      external_reference?: string;
      notes?: string;
    },
  ) =>
    apiClient.post(`/api/packages/${encodeURIComponent(packageId)}/payments`, payload),

  // invoices (trainer-side)
  listInvoices: (params?: { student_id?: string; status?: InvoiceStatus }) => {
    const search = new URLSearchParams();
    if (params?.student_id) search.set('student_id', params.student_id);
    if (params?.status) search.set('status', params.status);
    const qs = search.toString();
    return apiClient.get<InvoiceRow[]>(`/api/invoices${qs ? `?${qs}` : ''}`);
  },
  createInvoice: (payload: InvoiceCreateRequest) =>
    apiClient.post<InvoiceRow>('/api/invoices', payload),
  sendInvoice: (invoiceId: string, toEmail?: string) =>
    apiClient.post<{ public_url: string; delivery: SendNotificationResult }>(
      `/api/invoices/${encodeURIComponent(invoiceId)}/send`,
      toEmail ? { to_email: toEmail } : {},
    ),
  cancelInvoice: (invoiceId: string) =>
    apiClient.post(`/api/invoices/${encodeURIComponent(invoiceId)}/cancel`, {}),

  // invoices (public — student view)
  getPublicInvoice: (token: string) =>
    apiClient.get<InvoicePublicPayload>(
      `/api/invoices/public/${encodeURIComponent(token)}`,
      { authed: false },
    ),

  // scheduled sessions
  listScheduled: (params?: {
    student_id?: string;
    from_date?: string;
    to_date?: string;
  }) => {
    const search = new URLSearchParams();
    if (params?.student_id) search.set('student_id', params.student_id);
    if (params?.from_date) search.set('from_date', params.from_date);
    if (params?.to_date) search.set('to_date', params.to_date);
    const qs = search.toString();
    return apiClient.get<ScheduledSessionRow[]>(
      `/api/scheduled-sessions${qs ? `?${qs}` : ''}`,
    );
  },
  scheduleSession: (payload: ScheduledSessionCreateRequest) =>
    apiClient.post<ScheduledSessionRow>('/api/scheduled-sessions', payload),
  updateSchedule: (
    scheduleId: string,
    payload: ScheduledSessionUpdateRequest,
  ) =>
    apiClient.patch<ScheduledSessionRow>(
      `/api/scheduled-sessions/${encodeURIComponent(scheduleId)}`,
      payload,
    ),
  deleteSchedule: (scheduleId: string) =>
    apiClient.delete<{ deleted: boolean; id: string }>(
      `/api/scheduled-sessions/${encodeURIComponent(scheduleId)}`,
    ),
  remindStudent: (scheduleId: string, toEmail?: string) =>
    apiClient.post<SendNotificationResult>(
      `/api/scheduled-sessions/${encodeURIComponent(scheduleId)}/remind`,
      toEmail ? { to_email: toEmail } : {},
    ),
};
