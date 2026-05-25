import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { AdminArtistAccount, ArtistAccessStatus } from '../types';

type AdminArtistAccountRow = {
  artist_id: string;
  user_id: string;
  email: string;
  slug: string;
  artistic_name: string;
  real_name: string;
  instagram: string;
  whatsapp: string;
  city: string;
  state: string;
  plan_status: 'active' | 'blocked';
  created_at: string;
  access_until: string | null;
  access_lifetime: boolean;
  access_source: string;
  latest_grant_note: string;
};

type ArtistAccessStatusRow = {
  has_access: boolean;
  access_until: string | null;
  lifetime: boolean;
  source: string;
};

const uploadApiUrl = (import.meta.env.VITE_UPLOAD_API_URL || '').replace(/\/+$/, '');

function requireApiUrl() {
  if (!uploadApiUrl) {
    throw new Error('API backend nao configurada. Configure VITE_UPLOAD_API_URL.');
  }

  return uploadApiUrl;
}

function apiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const baseUrl = requireApiUrl();
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

async function authHeaders() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase Auth precisa estar configurado.');
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sessao expirada. Entre novamente.');

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Nao foi possivel concluir a operacao.');
  }

  return data as T;
}

function toAdminArtistAccount(row: AdminArtistAccountRow): AdminArtistAccount {
  return {
    artistId: row.artist_id,
    userId: row.user_id,
    email: row.email ?? '',
    slug: row.slug,
    artisticName: row.artistic_name,
    realName: row.real_name,
    instagram: row.instagram,
    whatsapp: row.whatsapp,
    city: row.city,
    state: row.state,
    planStatus: row.plan_status,
    createdAt: row.created_at,
    accessUntil: row.access_until,
    accessLifetime: row.access_lifetime,
    accessSource: row.access_source,
    latestGrantNote: row.latest_grant_note,
  };
}

export async function setArtistBlocked(artistId: string, blocked: boolean) {
  await parseApiResponse(
    await fetch(apiUrl(`/api/admin/artists/${artistId}/block`), {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ blocked }),
    })
  );
}

export async function isCurrentUserPlatformAdmin() {
  try {
    const data = await parseApiResponse<{ isAdmin: boolean }>(
      await fetch(apiUrl('/api/admin/is-platform-admin'), {
        headers: await authHeaders(),
      })
    );
    return Boolean(data.isAdmin);
  } catch {
    return false;
  }
}

export async function listAdminArtistAccounts() {
  const data = await parseApiResponse<{ artists: AdminArtistAccountRow[] }>(
    await fetch(apiUrl('/api/admin/artists'), {
      headers: await authHeaders(),
    })
  );
  return (data.artists || []).map(toAdminArtistAccount);
}

export async function getPlatformBillingSettings() {
  try {
    const response = await fetch(apiUrl('/api/platform-settings/monthly-price'));
    const data = await response.json().catch(() => ({}));

    if (response.ok && typeof data.monthlyPriceCents === 'number') {
      return { monthlyPriceCents: data.monthlyPriceCents };
    }
  } catch {
    return { monthlyPriceCents: 4900 };
  }

  return { monthlyPriceCents: 4900 };
}

export async function updatePlatformMonthlyPrice(monthlyPriceCents: number) {
  const data = await parseApiResponse<{ monthlyPriceCents: number }>(
    await fetch(apiUrl('/api/admin/platform-settings/monthly-price'), {
      method: 'PUT',
      headers: await authHeaders(),
      body: JSON.stringify({ monthlyPriceCents }),
    })
  );
  return Number(data.monthlyPriceCents || monthlyPriceCents);
}

export async function grantArtistAccess(
  artistId: string,
  endsAt: string | null,
  lifetime: boolean,
  note: string,
  grantType: 'trial' | 'manual_free' | 'paid_pix' | 'paid_mercado_pago' | 'paid_infinitepay' | 'lifetime' = 'manual_free'
) {
  await parseApiResponse(
    await fetch(apiUrl(`/api/admin/artists/${artistId}/grants`), {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ endsAt, lifetime, note, grantType }),
    })
  );
}

export async function getArtistAccessStatus(artistId: string): Promise<ArtistAccessStatus | null> {
  try {
    const data = await parseApiResponse<ArtistAccessStatusRow>(
      await fetch(apiUrl(`/api/artists/${artistId}/access-status`), {
        headers: await authHeaders(),
      })
    );
    return {
      hasAccess: data.has_access,
      accessUntil: data.access_until,
      lifetime: data.lifetime,
      source: data.source,
    };
  } catch {
    return null;
  }
}

export async function canClaimArtistMonthlyGrace(artistId: string): Promise<boolean> {
  try {
    const data = await parseApiResponse<{ canClaim: boolean }>(
      await fetch(apiUrl(`/api/artists/${artistId}/grace/can`), {
        headers: await authHeaders(),
      })
    );
    return Boolean(data.canClaim);
  } catch {
    return false;
  }
}

export async function claimArtistMonthlyGrace(artistId: string): Promise<string | null> {
  const data = await parseApiResponse<{ endsAt: string }>(
    await fetch(apiUrl(`/api/artists/${artistId}/grace/claim`), {
      method: 'POST',
      headers: await authHeaders(),
    })
  );
  return data.endsAt || null;
}
