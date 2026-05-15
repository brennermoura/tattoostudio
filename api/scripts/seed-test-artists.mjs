import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: 'api/.env', quiet: true });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam existir em api/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const testArtists = [
  {
    email: 'teste.pago@tatuapp.local',
    password: 'TestePago123!',
    slug: 'teste-pago',
    artisticName: 'Teste Pago',
    realName: 'Usuario Teste Pago',
    whatsapp: '11991000001',
    city: 'São Paulo',
    state: 'São Paulo',
    latitude: -23.5505,
    longitude: -46.6333,
    styles: ['Blackwork', 'Fineline'],
    planStatus: 'active',
    likeTotal: 18,
    grant: {
      grant_type: 'paid_pix',
      lifetime: false,
      note: 'Pagamento Pix confirmado para teste',
      ends_at: daysFromNow(30),
    },
  },
  {
    email: 'teste.inadimplente@tatuapp.local',
    password: 'TesteAtrasado123!',
    slug: 'teste-inadimplente',
    artisticName: 'Teste Inadimplente',
    realName: 'Usuario Teste Inadimplente',
    whatsapp: '11991000002',
    city: 'Campinas',
    state: 'São Paulo',
    latitude: -22.9056,
    longitude: -47.0608,
    styles: ['Realismo', 'Aquarela'],
    planStatus: 'active',
    likeTotal: 7,
    grant: null,
  },
  {
    email: 'teste.bloqueado@tatuapp.local',
    password: 'TesteBloqueado123!',
    slug: 'teste-bloqueado',
    artisticName: 'Teste Bloqueado',
    realName: 'Usuario Teste Bloqueado',
    whatsapp: '11991000003',
    city: 'Santos',
    state: 'São Paulo',
    latitude: -23.9608,
    longitude: -46.3336,
    styles: ['Old School', 'New School'],
    planStatus: 'blocked',
    likeTotal: 2,
    grant: null,
  },
  {
    email: 'teste.rio@tatuapp.local',
    password: 'TesteRio123!',
    slug: 'teste-rio',
    artisticName: 'Luna Rio Ink',
    realName: 'Luna Martins',
    whatsapp: '21991000004',
    city: 'Rio de Janeiro',
    state: 'Rio de Janeiro',
    latitude: -22.9068,
    longitude: -43.1729,
    styles: ['Fineline', 'Minimalista', 'Aquarela'],
    planStatus: 'active',
    likeTotal: 31,
    grant: {
      grant_type: 'paid_pix',
      lifetime: false,
      note: 'Pagamento Pix confirmado para teste',
      ends_at: daysFromNow(30),
    },
  },
  {
    email: 'teste.bh@tatuapp.local',
    password: 'TesteBH123!',
    slug: 'teste-bh',
    artisticName: 'Nero Niterói Tattoo',
    realName: 'Nero Andrade',
    whatsapp: '21991000005',
    city: 'Niterói',
    state: 'Rio de Janeiro',
    latitude: -22.8832,
    longitude: -43.1034,
    styles: ['Blackwork', 'Geométrico', 'Pontilhismo'],
    planStatus: 'active',
    likeTotal: 22,
    grant: {
      grant_type: 'manual_free',
      lifetime: false,
      note: 'Cortesia de teste',
      ends_at: daysFromNow(365),
    },
  },
  {
    email: 'teste.curitiba@tatuapp.local',
    password: 'TesteCuritiba123!',
    slug: 'teste-curitiba',
    artisticName: 'Maya Osasco',
    realName: 'Maya Rocha',
    whatsapp: '11991000006',
    city: 'Osasco',
    state: 'São Paulo',
    latitude: -23.5329,
    longitude: -46.7920,
    styles: ['Neo-Tradicional', 'Old School'],
    planStatus: 'active',
    likeTotal: 16,
    grant: null,
  },
  {
    email: 'teste.floripa@tatuapp.local',
    password: 'TesteFloripa123!',
    slug: 'teste-floripa',
    artisticName: 'Caio Búzios Ink',
    realName: 'Caio Ferreira',
    whatsapp: '22991000007',
    city: 'Armação dos Búzios',
    state: 'Rio de Janeiro',
    latitude: -22.7564,
    longitude: -41.8890,
    styles: ['Japonês', 'Blackwork'],
    planStatus: 'active',
    likeTotal: 27,
    grant: {
      grant_type: 'paid_pix',
      lifetime: false,
      note: 'Pagamento Pix confirmado para teste',
      ends_at: daysFromNow(30),
    },
  },
  {
    email: 'teste.poa@tatuapp.local',
    password: 'TestePOA123!',
    slug: 'teste-poa',
    artisticName: 'Iris Guarulhos Studio',
    realName: 'Iris Almeida',
    whatsapp: '11991000008',
    city: 'Guarulhos',
    state: 'São Paulo',
    latitude: -23.4543,
    longitude: -46.5337,
    styles: ['Realismo', 'Minimalista'],
    planStatus: 'active',
    likeTotal: 11,
    grant: null,
  },
];

function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

async function getOrCreateUser(artist) {
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (listError) throw listError;

  const existing = usersData.users.find((user) => user.email === artist.email);
  if (existing) return existing;

  const { data, error } = await supabase.auth.admin.createUser({
    email: artist.email,
    password: artist.password,
    email_confirm: true,
    user_metadata: {
      role: 'artist',
      artistic_name: artist.artisticName,
      real_name: artist.realName,
      whatsapp: artist.whatsapp,
      city: artist.city,
      state: artist.state,
      latitude: artist.latitude,
      longitude: artist.longitude,
    },
  });

  if (error) throw error;
  return data.user;
}

async function upsertArtistProfile(artist, userId) {
  const { data, error } = await supabase
    .from('artist_profiles')
    .upsert(
      {
        user_id: userId,
        slug: artist.slug,
        artistic_name: artist.artisticName,
        real_name: artist.realName,
        avatar_path:
          'https://images.pexels.com/photos/7908899/pexels-photo-7908899.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=240&w=240',
        avatar_source: 'external_url',
        cover_path:
          'https://images.pexels.com/photos/35742622/pexels-photo-35742622.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',
        cover_source: 'external_url',
        bio: 'Perfil fantasma para testar planos, bloqueios e agendamentos.',
        instagram: `@${artist.slug}`,
        whatsapp: artist.whatsapp,
        city: artist.city,
        state: artist.state,
        latitude: artist.latitude,
        longitude: artist.longitude,
        styles: artist.styles,
        accent_color: '#a855f7',
        plan_status: artist.planStatus,
      },
      { onConflict: 'user_id' }
    )
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

async function resetRelatedData(artistId) {
  await supabase.from('artist_access_grants').delete().eq('artist_id', artistId);
  await supabase.from('artist_likes').delete().eq('artist_id', artistId);
  await supabase.from('weekly_slots').delete().eq('artist_id', artistId);
  await supabase.from('blocked_dates').delete().eq('artist_id', artistId);
  await supabase.from('portfolio_photos').delete().eq('artist_id', artistId);
}

async function seedArtistData(artist, artistId) {
  await supabase.from('artist_pix_settings').upsert({
    artist_id: artistId,
    pix_key: 'cbb8e3a6-2212-441a-86e1-c1311ec93dea',
    pix_type: 'random',
    deposit_value: 150,
    deposit_required: true,
  });

  await supabase.from('weekly_slots').insert([
    { artist_id: artistId, weekday: 2, slot_time: '10:00' },
    { artist_id: artistId, weekday: 2, slot_time: '15:00' },
    { artist_id: artistId, weekday: 4, slot_time: '11:00' },
    { artist_id: artistId, weekday: 5, slot_time: '16:00' },
  ]);

  await supabase.from('portfolio_photos').insert([
    {
      artist_id: artistId,
      file_path:
        'https://images.pexels.com/photos/4912590/pexels-photo-4912590.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      file_source: 'external_url',
      alt: `${artist.artisticName} portfolio 1`,
      sort_order: 1,
    },
    {
      artist_id: artistId,
      file_path:
        'https://images.pexels.com/photos/12742814/pexels-photo-12742814.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      file_source: 'external_url',
      alt: `${artist.artisticName} portfolio 2`,
      sort_order: 2,
    },
  ]);

  if (artist.grant) {
    const { error } = await supabase.from('artist_access_grants').insert({
      artist_id: artistId,
      grant_type: artist.grant.grant_type,
      lifetime: artist.grant.lifetime,
      ends_at: artist.grant.ends_at,
      note: artist.grant.note,
    });

    if (error) throw error;
  }

  await supabase.from('artist_likes').insert(
    Array.from({ length: artist.likeTotal }, (_, index) => ({
      artist_id: artistId,
      visitor_token: `seed-${artist.slug}-${index + 1}`,
    }))
  );
}

for (const artist of testArtists) {
  const user = await getOrCreateUser(artist);
  const artistId = await upsertArtistProfile(artist, user.id);
  await resetRelatedData(artistId);
  await seedArtistData(artist, artistId);

  console.log(
    `${artist.artisticName}: ${artist.email} / ${artist.password} / ${artist.slug} / ${artist.planStatus}`
  );
}

console.log('Usuarios fantasmas criados/atualizados com sucesso.');
