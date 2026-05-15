import { isSupabaseConfigured, supabase } from '../lib/supabase';

const uploadApiUrl = (import.meta.env.VITE_UPLOAD_API_URL || '').replace(/\/+$/, '');

type CheckoutResponse = {
  id: string;
  externalReference: string;
  preferenceId: string;
  checkoutUrl: string;
  sandboxCheckoutUrl?: string;
};

function apiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
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

export async function createPlatformCheckout() {
  const response = await fetch(apiUrl('/api/platform-payments/checkout'), {
    method: 'POST',
    headers: await authHeaders(),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Nao foi possivel iniciar o pagamento.');
  }

  return data as CheckoutResponse;
}
