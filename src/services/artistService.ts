import { Appointment, ArtistProfile, ExploreArtist } from '../types';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getOrCreateVisitorToken } from '../utils/localPrototype';

type CreatedAppointmentRow = {
  id: string;
  created_at: string;
  depositRequired: boolean;
  depositPaid: boolean;
  depositCreditUsed: boolean;
  paymentStatus: Appointment['paymentStatus'];
  proofUploadToken: string;
  reservationCode?: string;
  reservationExpiresAt?: string | null;
};

type LikeStatusRow = {
  like_count: number;
  viewer_liked: boolean;
};

type CreateArtistProfileInput = {
  artisticName: string;
  whatsapp: string;
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  neighborhood?: string;
  postalCode?: string;
  publicNeighborhood?: string;
  publicAddressLabel?: string;
  city: string;
  state?: string;
  latitude?: number | null;
  longitude?: number | null;
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

async function parseApiResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Nao foi possivel concluir a operacao.');
  }

  return data as T;
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

async function publicViewerHeaders(includeJson = false) {
  const headers: Record<string, string> = {};
  if (includeJson) headers['Content-Type'] = 'application/json';

  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      headers.Authorization = `Bearer ${data.session.access_token}`;
    }
  }

  return headers;
}

export async function loadPublicArtistBySlug(slug: string): Promise<ArtistProfile | null> {
  try {
    const data = await parseApiResponse<{ artist: ArtistProfile }>(
      await fetch(
        apiUrl(`/api/public/profiles/${slug}?visitorToken=${encodeURIComponent(getOrCreateVisitorToken())}`),
        { headers: await publicViewerHeaders() }
      )
    );
    return data.artist;
  } catch {
    return null;
  }
}

export async function listPublicExploreArtists(): Promise<ExploreArtist[]> {
  try {
    const data = await parseApiResponse<{ artists: ExploreArtist[] }>(
      await fetch(
        apiUrl(`/api/public/artists?visitorToken=${encodeURIComponent(getOrCreateVisitorToken())}`),
        { headers: await publicViewerHeaders() }
      )
    );
    return data.artists || [];
  } catch {
    return [];
  }
}

export async function loadArtistByUserId(_userId: string): Promise<ArtistProfile | null> {
  try {
    const data = await parseApiResponse<{ artist: ArtistProfile }>(
      await fetch(apiUrl('/api/me/artist'), {
        headers: await authHeaders(),
      })
    );
    return data.artist;
  } catch {
    return null;
  }
}

export async function createArtistProfileForCurrentUser(
  input: CreateArtistProfileInput
): Promise<ArtistProfile | null> {
  try {
    const data = await parseApiResponse<{ artist: ArtistProfile }>(
      await fetch(apiUrl('/api/me/artist'), {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(input),
      })
    );
    return data.artist;
  } catch {
    return null;
  }
}

export async function createPublicAppointment(
  artist: ArtistProfile,
  appointment: Appointment
): Promise<Appointment | null> {
  const data = await parseApiResponse<CreatedAppointmentRow>(
    await fetch(apiUrl('/api/public/appointments'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artistId: artist.id,
        clientName: appointment.clientName,
        clientPhone: appointment.clientPhone,
        clientEmail: appointment.clientEmail,
        date: appointment.date,
        time: appointment.time,
        description: appointment.description,
        website: appointment.website || '',
      }),
    })
  );

  return {
    ...appointment,
    id: data.id,
    createdAt: data.created_at,
    depositRequired: data.depositRequired,
    depositPaid: data.depositPaid,
    depositCreditUsed: data.depositCreditUsed,
    paymentStatus: data.paymentStatus,
    proofUploadToken: data.proofUploadToken,
    reservationCode: data.reservationCode,
    reservationExpiresAt: data.reservationExpiresAt,
  };
}

export async function toggleArtistLike(artistId: string) {
  const data = await parseApiResponse<LikeStatusRow>(
    await fetch(apiUrl(`/api/public/artists/${artistId}/likes/toggle`), {
      method: 'POST',
      headers: await publicViewerHeaders(true),
      body: JSON.stringify({ visitorToken: getOrCreateVisitorToken() }),
    })
  );

  return {
    likeCount: data.like_count ?? 0,
    viewerLiked: data.viewer_liked ?? false,
  };
}

export async function saveDashboardArtist(artist: ArtistProfile): Promise<void> {
  await parseApiResponse(
    await fetch(apiUrl(`/api/me/artist/${artist.id}`), {
      method: 'PUT',
      headers: await authHeaders(),
      body: JSON.stringify(artist),
    })
  );
}

export async function updateAppointmentStatus(
  _artistId: string,
  appointmentId: string,
  status: Appointment['status']
): Promise<void> {
  await parseApiResponse(
    await fetch(apiUrl(`/api/me/appointments/${appointmentId}/status`), {
      method: 'PATCH',
      headers: await authHeaders(),
      body: JSON.stringify({ status }),
    })
  );
}

export async function updateAppointmentSchedule(
  _artistId: string,
  appointmentId: string,
  date: string,
  time: string
): Promise<void> {
  await parseApiResponse(
    await fetch(apiUrl(`/api/me/appointments/${appointmentId}/schedule`), {
      method: 'PATCH',
      headers: await authHeaders(),
      body: JSON.stringify({ date, time }),
    })
  );
}

export async function reviewAppointmentProof(
  appointmentId: string,
  decision: 'approve' | 'reject',
  reason = ''
): Promise<{ paymentStatus: Appointment['paymentStatus']; depositPaid: boolean }> {
  return parseApiResponse(
    await fetch(apiUrl(`/api/me/appointments/${appointmentId}/proof/${decision}`), {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ reason }),
    })
  );
}
