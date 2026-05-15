import { ArtistProfile, Appointment, ExploreArtist, PortfolioPhoto, TattooStyle } from '../types';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { mockArtist } from '../data/mockData';
import { getOrCreateVisitorToken, slugify } from '../utils/localPrototype';
import { inferBrazilianStateFromText } from '../constants/locations';

type ArtistProfileRow = {
  id: string;
  slug: string;
  artistic_name: string;
  real_name: string;
  avatar_path: string;
  cover_path: string;
  bio: string;
  instagram: string;
  whatsapp: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  styles: string[];
  accent_color: string;
  plan_status: ArtistProfile['plan'];
};

type ExploreArtistRow = ArtistProfileRow & {
  created_at: string;
};

type PixSettingsRow = {
  pix_key: string;
  pix_type: ArtistProfile['pixType'];
  deposit_value: number;
  deposit_required: boolean;
};

type PortfolioPhotoRow = {
  id: string;
  artist_id?: string;
  file_path: string;
  alt: string;
  sort_order: number;
};

type WeeklySlotRow = {
  weekday: number;
  slot_time: string;
};

type BlockedDateRow = {
  blocked_date: string;
};

type ApprovedSlotRow = {
  appointment_date: string;
  appointment_time: string;
};

type AppointmentRow = {
  id: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  appointment_date: string;
  appointment_time: string;
  description: string;
  status: Appointment['status'];
  deposit_required: boolean;
  deposit_paid: boolean;
  deposit_credit_used: boolean;
  created_at: string;
};

type AppointmentFileRow = {
  id: string;
  appointment_id: string;
  file_path: string;
};

type CreatedAppointmentRow = {
  id: string;
  created_at: string;
};

type LikeStatusRow = {
  like_count: number;
  viewer_liked: boolean;
};

type CreateArtistProfileInput = {
  artisticName: string;
  whatsapp: string;
  city: string;
  state?: string;
  latitude?: number | null;
  longitude?: number | null;
};

const DEFAULT_TIMES = {
  workStart: '10:00',
  workEnd: '19:00',
  lunchStart: '13:00',
  lunchEnd: '14:00',
};

const uploadApiUrl = (import.meta.env.VITE_UPLOAD_API_URL || '').replace(/\/+$/, '');

function resolvePublicFileUrl(value?: string) {
  if (!value) return '';
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith('/uploads/') && uploadApiUrl) return `${uploadApiUrl}${value}`;
  return value;
}

function normalizeTime(value: string) {
  return value.slice(0, 5);
}

function buildCustomSlots(rows: WeeklySlotRow[]) {
  return rows.reduce<Record<string, string[]>>((slots, row) => {
    const dayKey = String(row.weekday);
    slots[dayKey] = [...(slots[dayKey] ?? []), normalizeTime(row.slot_time)].sort();
    return slots;
  }, {});
}

function toPortfolioPhoto(row: PortfolioPhotoRow): PortfolioPhoto {
  return {
    id: row.id,
    url: resolvePublicFileUrl(row.file_path),
    alt: row.alt,
  };
}

function toApprovedAppointment(row: ApprovedSlotRow): Appointment {
  return {
    id: `${row.appointment_date}-${row.appointment_time}`,
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    date: row.appointment_date,
    time: normalizeTime(row.appointment_time),
    description: '',
    status: 'approved',
    createdAt: '',
    depositPaid: true,
  };
}

function toAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    clientEmail: row.client_email,
    date: row.appointment_date,
    time: normalizeTime(row.appointment_time),
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    depositPaid: row.deposit_paid,
    depositRequired: row.deposit_required,
    depositCreditUsed: row.deposit_credit_used,
  };
}

async function getArtistLikeStatus(artistId: string) {
  if (!supabase) return { likeCount: 0, viewerLiked: false };

  const visitorToken = typeof window !== 'undefined' ? getOrCreateVisitorToken() : '';

  const { data } = await supabase
    .rpc('get_public_artist_like_status', {
      p_artist_id: artistId,
      p_visitor_token: visitorToken,
    })
    .returns<LikeStatusRow[]>()
    .single();

  return {
    likeCount: data?.like_count ?? 0,
    viewerLiked: data?.viewer_liked ?? false,
  };
}

async function buildArtistProfile(profile: ArtistProfileRow, includePrivateAppointments = false) {
  if (!supabase) return null;

  const [
    { data: pix },
    { data: portfolio },
    { data: slots },
    { data: blockedDates },
    appointmentsResult,
  ] = await Promise.all([
    supabase
      .from('artist_pix_settings')
      .select('pix_key, pix_type, deposit_value, deposit_required')
      .eq('artist_id', profile.id)
      .maybeSingle<PixSettingsRow>(),
    supabase
      .from('portfolio_photos')
      .select('id, file_path, alt, sort_order')
      .eq('artist_id', profile.id)
      .order('sort_order', { ascending: true })
      .returns<PortfolioPhotoRow[]>(),
    supabase
      .from('weekly_slots')
      .select('weekday, slot_time')
      .eq('artist_id', profile.id)
      .order('weekday', { ascending: true })
      .order('slot_time', { ascending: true })
      .returns<WeeklySlotRow[]>(),
    supabase
      .from('blocked_dates')
      .select('blocked_date')
      .eq('artist_id', profile.id)
      .returns<BlockedDateRow[]>(),
    includePrivateAppointments
      ? supabase
          .from('appointments')
          .select(
            'id, client_name, client_phone, client_email, appointment_date, appointment_time, description, status, deposit_required, deposit_paid, deposit_credit_used, created_at'
          )
          .eq('artist_id', profile.id)
          .order('created_at', { ascending: false })
          .returns<AppointmentRow[]>()
      : supabase.rpc('get_public_approved_slots', { profile_slug: profile.slug }).returns<ApprovedSlotRow[]>(),
  ]);

  const customSlots = buildCustomSlots(slots ?? []);
  const availableDays = Object.entries(customSlots)
    .filter(([, daySlots]) => daySlots.length > 0)
    .map(([day]) => Number(day))
    .sort();

  const appointments = includePrivateAppointments
    ? ((appointmentsResult.data ?? []) as AppointmentRow[]).map(toAppointment)
    : ((appointmentsResult.data ?? []) as ApprovedSlotRow[]).map(toApprovedAppointment);

  if (includePrivateAppointments && appointments.length > 0) {
    const { data: files } = await supabase
      .from('appointment_files')
      .select('id, appointment_id, file_path')
      .eq('artist_id', profile.id)
      .eq('file_type', 'pix_proof')
      .in(
        'appointment_id',
        appointments.map((appointment) => appointment.id)
      )
      .order('created_at', { ascending: false })
      .returns<AppointmentFileRow[]>();

    const proofByAppointment = new Map<string, string>();
    for (const file of files ?? []) {
      if (!proofByAppointment.has(file.appointment_id)) {
        proofByAppointment.set(
          file.appointment_id,
          file.file_path.startsWith('/private-uploads/')
            ? `/api/appointment-files/${file.id}/open`
            : file.file_path
        );
      }
    }

    for (const appointment of appointments) {
      const proofPath = proofByAppointment.get(appointment.id);
      if (proofPath) {
        appointment.pixProof = proofPath;
      }
    }
  }

  const likeStatus = await getArtistLikeStatus(profile.id);

  return {
    id: profile.id,
    slug: profile.slug,
    artisticName: profile.artistic_name,
    realName: profile.real_name,
    avatar: resolvePublicFileUrl(profile.avatar_path),
    coverImage: resolvePublicFileUrl(profile.cover_path),
    bio: profile.bio,
    instagram: profile.instagram,
    whatsapp: profile.whatsapp,
    city: profile.city,
    state: profileState(profile),
    latitude: profile.latitude,
    longitude: profile.longitude,
    styles: profile.styles as TattooStyle[],
    portfolio: (portfolio ?? []).map(toPortfolioPhoto).slice(0, 10),
    pixKey: pix?.pix_key ?? '',
    pixType: pix?.pix_type ?? 'phone',
    depositValue: pix?.deposit_value ?? 0,
    depositRequired: pix?.deposit_required ?? false,
    availableDays,
    customSlots,
    blockedDates: (blockedDates ?? []).map((date) => date.blocked_date),
    appointments,
    accentColor: profile.accent_color,
    plan: profile.plan_status,
    likeCount: likeStatus.likeCount,
    viewerLiked: likeStatus.viewerLiked,
    ...DEFAULT_TIMES,
  } satisfies ArtistProfile;
}

export async function loadPublicArtistBySlug(slug: string): Promise<ArtistProfile | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const { data: profile, error: profileError } = await supabase
    .from('artist_profiles')
    .select(
      'id, slug, artistic_name, real_name, avatar_path, cover_path, bio, instagram, whatsapp, city, state, latitude, longitude, styles, accent_color, plan_status'
    )
    .eq('slug', slug)
    .eq('plan_status', 'active')
    .maybeSingle<ArtistProfileRow>();

  if (profileError || !profile) return null;

  return buildArtistProfile(profile);
}

export async function listPublicExploreArtists(): Promise<ExploreArtist[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [
      {
        id: mockArtist.id,
        slug: mockArtist.slug,
        artisticName: mockArtist.artisticName,
        avatar: mockArtist.avatar,
        coverImage: mockArtist.coverImage,
        bio: mockArtist.bio,
        instagram: mockArtist.instagram,
        city: mockArtist.city,
        state: mockArtist.state,
        latitude: mockArtist.latitude,
        longitude: mockArtist.longitude,
        styles: mockArtist.styles,
        accentColor: mockArtist.accentColor,
        createdAt: new Date().toISOString(),
        likeCount: mockArtist.likeCount,
        featuredImage: mockArtist.portfolio[0]?.url,
      },
    ];
  }

  const { data: profiles, error } = await supabase
    .from('artist_profiles')
    .select(
      'id, slug, artistic_name, real_name, avatar_path, cover_path, bio, instagram, whatsapp, city, state, latitude, longitude, styles, accent_color, plan_status, created_at'
    )
    .eq('plan_status', 'active')
    .order('created_at', { ascending: false })
    .limit(80)
    .returns<ExploreArtistRow[]>();

  if (error || !profiles) return [];

  const artistIds = profiles.map((profile) => profile.id);
  const portfolioByArtist = new Map<string, string>();

  if (artistIds.length > 0) {
    const { data: photos } = await supabase
      .from('portfolio_photos')
      .select('artist_id, file_path, sort_order')
      .in('artist_id', artistIds)
      .order('sort_order', { ascending: true })
      .returns<PortfolioPhotoRow[]>();

    for (const photo of photos ?? []) {
      if (photo.artist_id && !portfolioByArtist.has(photo.artist_id)) {
        portfolioByArtist.set(photo.artist_id, photo.file_path);
      }
    }
  }

  const likeStatuses = await Promise.all(
    profiles.map((profile) => getArtistLikeStatus(profile.id))
  );

  return profiles.map((profile, index) => ({
    id: profile.id,
    slug: profile.slug,
    artisticName: profile.artistic_name,
    avatar: resolvePublicFileUrl(profile.avatar_path),
    coverImage: resolvePublicFileUrl(profile.cover_path),
    bio: profile.bio,
    instagram: profile.instagram,
    city: profile.city,
    state: profileState(profile),
    latitude: profile.latitude,
    longitude: profile.longitude,
    styles: profile.styles as TattooStyle[],
    accentColor: profile.accent_color,
    createdAt: profile.created_at,
    likeCount: likeStatuses[index]?.likeCount ?? 0,
    featuredImage: resolvePublicFileUrl(portfolioByArtist.get(profile.id)),
  }));
}

export async function loadArtistByUserId(userId: string): Promise<ArtistProfile | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const { data: profile, error } = await supabase
    .from('artist_profiles')
    .select(
      'id, slug, artistic_name, real_name, avatar_path, cover_path, bio, instagram, whatsapp, city, state, latitude, longitude, styles, accent_color, plan_status'
    )
    .eq('user_id', userId)
    .maybeSingle<ArtistProfileRow>();

  if (error || !profile) return null;

  return buildArtistProfile(profile, true);
}

export async function createArtistProfileForCurrentUser(
  input: CreateArtistProfileInput
): Promise<ArtistProfile | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;

  if (userError || !user) return null;

  const existing = await loadArtistByUserId(user.id);
  if (existing) return existing;

  const slugBase = slugify(input.artisticName) || `artista-${user.id.slice(0, 8)}`;
  const slug = `${slugBase}-${user.id.slice(0, 6)}`;

  const { data: profile, error } = await supabase
    .from('artist_profiles')
    .insert({
      user_id: user.id,
      slug,
      artistic_name: input.artisticName,
      real_name: input.artisticName,
      whatsapp: input.whatsapp,
      city: input.city,
      state: input.state ?? inferBrazilianStateFromText(input.city),
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      styles: mockArtist.styles,
      bio: mockArtist.bio,
      avatar_path: mockArtist.avatar,
      cover_path: mockArtist.coverImage,
      accent_color: mockArtist.accentColor,
      plan_status: 'active',
    })
    .select(
      'id, slug, artistic_name, real_name, avatar_path, cover_path, bio, instagram, whatsapp, city, state, latitude, longitude, styles, accent_color, plan_status'
    )
    .single<ArtistProfileRow>();

  if (error || !profile) return null;

  await supabase.from('artist_pix_settings').upsert({
    artist_id: profile.id,
    pix_key: '',
    pix_type: 'phone',
    deposit_value: 150,
    deposit_required: true,
  });

  return buildArtistProfile(profile, true);
}

export async function createPublicAppointment(
  artist: ArtistProfile,
  appointment: Appointment
): Promise<Appointment | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const paymentStatus =
    appointment.depositRequired === false
      ? 'not_required'
      : appointment.depositCreditUsed
      ? 'credited'
      : appointment.pixProof
      ? 'proof_sent'
      : 'pending_proof';

  const { data, error } = await supabase
    .rpc('create_public_appointment', {
      p_artist_id: artist.id,
      p_client_name: appointment.clientName,
      p_client_phone: appointment.clientPhone,
      p_client_email: appointment.clientEmail,
      p_appointment_date: appointment.date,
      p_appointment_time: appointment.time,
      p_description: appointment.description,
      p_deposit_required: appointment.depositRequired !== false,
      p_deposit_value: artist.depositValue,
      p_deposit_paid: appointment.depositPaid,
      p_deposit_credit_used: appointment.depositCreditUsed ?? false,
      p_payment_status: paymentStatus,
    })
    .returns<CreatedAppointmentRow[]>()
    .single();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    ...appointment,
    id: data.id,
    createdAt: data.created_at,
  };
}

export async function toggleArtistLike(artistId: string) {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  const { data, error } = await supabase
    .rpc('toggle_public_artist_like', {
      p_artist_id: artistId,
      p_visitor_token: getOrCreateVisitorToken(),
    })
    .returns<LikeStatusRow[]>()
    .single();

  if (error) throw new Error(error.message);

  return {
    likeCount: data?.like_count ?? 0,
    viewerLiked: data?.viewer_liked ?? false,
  };
}

function isPersistableFilePath(value: string) {
  return Boolean(value) && !value.startsWith('data:');
}

function fileSourceForPath(value: string) {
  return value.startsWith('/uploads/') ? 'upload' : 'external_url';
}

function profileState(profile: Pick<ArtistProfileRow, 'city' | 'state'>) {
  return profile.state || inferBrazilianStateFromText(profile.city);
}

export async function saveDashboardArtist(artist: ArtistProfile): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const profileUpdate = {
    slug: artist.slug,
    artistic_name: artist.artisticName,
    real_name: artist.realName || artist.artisticName,
    bio: artist.bio,
    instagram: artist.instagram,
    whatsapp: artist.whatsapp,
    city: artist.city,
    state: artist.state,
    latitude: artist.latitude ?? null,
    longitude: artist.longitude ?? null,
    styles: artist.styles,
    accent_color: artist.accentColor,
    ...(!artist.avatar || isPersistableFilePath(artist.avatar)
      ? {
          avatar_path: artist.avatar,
          avatar_source: artist.avatar ? fileSourceForPath(artist.avatar) : 'upload',
        }
      : {}),
    ...(!artist.coverImage || isPersistableFilePath(artist.coverImage)
      ? {
          cover_path: artist.coverImage,
          cover_source: artist.coverImage ? fileSourceForPath(artist.coverImage) : 'upload',
        }
      : {}),
  };
  const weeklySlotRows = Object.entries(artist.customSlots ?? {}).flatMap(([weekday, slots]) =>
    slots.map((slot) => ({
      artist_id: artist.id,
      weekday: Number(weekday),
      slot_time: slot,
    }))
  );
  const blockedDateRows = artist.blockedDates.map((blockedDate) => ({
    artist_id: artist.id,
    blocked_date: blockedDate,
  }));

  const { error: profileError } = await supabase
    .from('artist_profiles')
    .update(profileUpdate)
    .eq('id', artist.id);

  if (profileError) throw new Error(profileError.message);

  const { error: pixError } = await supabase.from('artist_pix_settings').upsert({
    artist_id: artist.id,
    pix_key: artist.pixKey,
    pix_type: artist.pixType,
    deposit_value: artist.depositValue,
    deposit_required: artist.depositRequired !== false,
  });

  if (pixError) throw new Error(pixError.message);

  const { error: slotsDeleteError } = await supabase
    .from('weekly_slots')
    .delete()
    .eq('artist_id', artist.id);

  if (slotsDeleteError) throw new Error(slotsDeleteError.message);

  if (weeklySlotRows.length > 0) {
    const { error: slotsInsertError } = await supabase.from('weekly_slots').insert(weeklySlotRows);
    if (slotsInsertError) throw new Error(slotsInsertError.message);
  }

  const { error: blockedDeleteError } = await supabase
    .from('blocked_dates')
    .delete()
    .eq('artist_id', artist.id);

  if (blockedDeleteError) throw new Error(blockedDeleteError.message);

  if (blockedDateRows.length > 0) {
    const { error: blockedInsertError } = await supabase.from('blocked_dates').insert(blockedDateRows);
    if (blockedInsertError) throw new Error(blockedInsertError.message);
  }

  // Portfolio uploads are handled by dedicated upload endpoints to avoid rewriting files on every dashboard save.
}

export async function updateAppointmentStatus(
  artistId: string,
  appointmentId: string,
  status: Appointment['status']
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const paymentStatus =
    status === 'approved' ? 'checked' : status === 'rejected' ? 'credited' : undefined;

  const { error } = await supabase
    .from('appointments')
    .update({
      status,
      ...(paymentStatus ? { payment_status: paymentStatus } : {}),
    })
    .eq('id', appointmentId)
    .eq('artist_id', artistId);

  if (error) throw new Error(error.message);
}
