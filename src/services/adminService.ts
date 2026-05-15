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

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase ainda nao esta configurado.');
  }

  return supabase;
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
  const client = requireSupabase();
  const { error } = await client.rpc('admin_set_artist_blocked', {
    p_artist_id: artistId,
    p_blocked: blocked,
  });

  if (error) throw new Error(error.message);
}

export async function isCurrentUserPlatformAdmin() {
  const client = requireSupabase();
  const { data, error } = await client.rpc('is_platform_admin');

  if (error) return false;
  return Boolean(data);
}

export async function listAdminArtistAccounts() {
  const client = requireSupabase();
  const { data, error } = await client
    .rpc('admin_list_artist_accounts')
    .returns<AdminArtistAccountRow[]>();

  if (error) throw new Error(error.message);
  const rows = Array.isArray(data) ? data : [];
  return rows.map(toAdminArtistAccount);
}

export async function grantArtistAccess(
  artistId: string,
  endsAt: string | null,
  lifetime: boolean,
  note: string,
  grantType: 'manual_free' | 'paid_pix' | 'paid_mercado_pago' | 'lifetime' = 'manual_free'
) {
  const client = requireSupabase();
  const { error } = await client.rpc('admin_grant_artist_access', {
    p_artist_id: artistId,
    p_ends_at: endsAt,
    p_lifetime: lifetime,
    p_note: note,
    p_grant_type: grantType,
  });

  if (error) throw new Error(error.message);
}

export async function getArtistAccessStatus(artistId: string): Promise<ArtistAccessStatus | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .rpc('get_artist_access_status', { p_artist_id: artistId })
    .returns<ArtistAccessStatusRow[]>()
    .single();

  if (error || !data) return null;

  return {
    hasAccess: data.has_access,
    accessUntil: data.access_until,
    lifetime: data.lifetime,
    source: data.source,
  };
}
