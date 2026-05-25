import { isSupabaseConfigured, supabase } from '../lib/supabase';

const uploadApiUrl = (import.meta.env.VITE_UPLOAD_API_URL || '').replace(/\/+$/, '');
const infinitePayCheckoutAmountCents = Number(import.meta.env.VITE_INFINITEPAY_CHECKOUT_AMOUNT_CENTS || 0);

type CheckoutResponse = {
  id: string;
  externalReference: string;
  preferenceId: string;
  checkoutUrl: string;
  sandboxCheckoutUrl?: string;
};

export type PlatformPayment = {
  id: string;
  provider: string;
  externalReference: string;
  providerPreferenceId: string;
  providerPaymentId: string;
  status: 'pending' | 'in_process' | 'approved' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back';
  amountCents: number;
  currency: string;
  checkoutUrl: string;
  rawPayload: Record<string, unknown>;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type PlatformPaymentRow = {
  id: string;
  provider: string;
  external_reference: string;
  provider_preference_id: string;
  provider_payment_id: string;
  status: PlatformPayment['status'];
  amount_cents: number;
  currency: string;
  checkout_url: string;
  raw_payload: Record<string, unknown> | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export function getStaticInfinitePayCheckoutUrl() {
  return '';
}

function mapPlatformPayment(row: PlatformPaymentRow): PlatformPayment {
  return {
    id: row.id,
    provider: String(row.raw_payload?.provider || row.provider || 'mercado_pago'),
    externalReference: row.external_reference,
    providerPreferenceId: row.provider_preference_id,
    providerPaymentId: row.provider_payment_id,
    status: row.status,
    amountCents: row.amount_cents,
    currency: row.currency,
    checkoutUrl: row.checkout_url,
    rawPayload: row.raw_payload || {},
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function apiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  if (!uploadApiUrl) {
    throw new Error('API backend nao configurada. Configure VITE_UPLOAD_API_URL.');
  }

  return `${uploadApiUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

async function authHeaders() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase precisa estar configurado para iniciar pagamento.');
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('Sessao expirada. Entre novamente.');
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function createExternalCheckoutRecord(checkoutUrl: string) {
  const response = await fetch(apiUrl('/api/platform-payments/external-checkout'), {
    method: 'POST',
    headers: {
      ...(await authHeaders()),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      checkoutUrl,
      amountCents: infinitePayCheckoutAmountCents,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Nao foi possivel registrar o pagamento.');
  }

  return data as CheckoutResponse;
}

export async function createInfinitePayCheckout() {
  const response = await fetch(apiUrl('/api/platform-payments/external-checkout'), {
    method: 'POST',
    headers: {
      ...(await authHeaders()),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amountCents: infinitePayCheckoutAmountCents,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Nao foi possivel iniciar o pagamento pela InfinitePay.');
  }

  return data as CheckoutResponse;
}

export async function createInfinitePaySubscription() {
  const response = await fetch(apiUrl('/api/platform-payments/subscription'), {
    method: 'POST',
    headers: {
      ...(await authHeaders()),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Nao foi possivel iniciar a assinatura pela InfinitePay.');
  }

  return data as CheckoutResponse;
}

export async function createInfinitePayApiCheckout() {
  const response = await fetch(apiUrl('/api/platform-payments/infinitepay-checkout'), {
    method: 'POST',
    headers: {
      ...(await authHeaders()),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Nao foi possivel iniciar o checkout da InfinitePay.');
  }

  return data as CheckoutResponse;
}

export async function getPlatformMonthlyPrice() {
  const fallback = Number(import.meta.env.VITE_PLATFORM_MONTHLY_PRICE || '49');

  try {
    const response = await fetch(apiUrl('/api/platform-settings/monthly-price'));
    const data = await response.json().catch(() => ({}));

    if (!response.ok || typeof data.monthlyPrice !== 'number') {
      return fallback;
    }

    return data.monthlyPrice;
  } catch {
    return fallback;
  }
}

export async function listPlatformPayments() {
  const response = await fetch(apiUrl('/api/platform-payments'), {
    headers: await authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Nao foi possivel listar pagamentos.');
  }

  return ((payload.payments || []) as PlatformPaymentRow[])
    .map(mapPlatformPayment)
    .filter((payment) => payment.provider !== 'mercado_pago' || payment.status === 'approved');
}
