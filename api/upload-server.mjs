import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: 'api/.env' });
dotenv.config({ path: '.env' });

const app = express();
const port = Number(process.env.API_PORT || 8787);
const isProduction = process.env.NODE_ENV === 'production';
const uploadsRoot = path.resolve(process.env.UPLOADS_DIR || 'public/uploads');
const privateUploadsRoot = path.resolve(process.env.PRIVATE_UPLOADS_DIR || 'private/uploads');
const maxImageSize = Number(process.env.MAX_IMAGE_UPLOAD_BYTES || 6 * 1024 * 1024);
const maxProofSize = Number(process.env.MAX_PROOF_UPLOAD_BYTES || 10 * 1024 * 1024);
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const mercadoPagoAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';
const mercadoPagoTestAccessToken = process.env.MERCADO_PAGO_TEST_ACCESS_TOKEN || '';
const mercadoPagoWebhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET || '';
const mercadoPagoCheckoutMode = process.env.MERCADO_PAGO_CHECKOUT_MODE === 'sandbox' ? 'sandbox' : 'production';
const platformMonthlyPrice = Number(process.env.PLATFORM_MONTHLY_PRICE || process.env.VITE_PLATFORM_MONTHLY_PRICE || 49);
const publicAppUrl = (process.env.PUBLIC_APP_URL || process.env.CORS_ORIGIN || 'http://localhost:5173').split(',')[0];
const publicApiBaseUrl = process.env.PUBLIC_API_BASE_URL || process.env.VITE_UPLOAD_API_URL || `http://localhost:${port}`;
const publicBaseUrl = (process.env.PUBLIC_UPLOAD_BASE_URL || publicApiBaseUrl).replace(/\/+$/, '');
const postalCodeApiBaseUrl = (process.env.POSTAL_CODE_API_BASE_URL || 'https://viacep.com.br/ws').replace(/\/+$/, '');
const postalCoordinatesApiBaseUrl = (
  process.env.POSTAL_COORDINATES_API_BASE_URL || 'https://brasilapi.com.br/api/cep/v2'
).replace(/\/+$/, '');
const geocoderApiBaseUrl = (process.env.GEOCODER_API_BASE_URL || 'https://nominatim.openstreetmap.org').replace(/\/+$/, '');
const infinitePayCheckoutUrl =
  process.env.INFINITEPAY_CHECKOUT_URL ||
  (process.env.INFINITEPAY_HANDLE?.startsWith('http') ? process.env.INFINITEPAY_HANDLE : '');
const infinitePaySubscriptionUrl =
  process.env.INFINITEPAY_SUBSCRIPTION_URL ||
  (process.env.INFINITEPAY_PLAN_URL?.startsWith('http') ? process.env.INFINITEPAY_PLAN_URL : '') ||
  (process.env.INFINITEPAY_HANDLE?.startsWith('https://invoice.infinitepay.io/plans/')
    ? process.env.INFINITEPAY_HANDLE
    : '');
const infinitePayHandle = (process.env.INFINITEPAY_HANDLE || '').startsWith('http')
  ? ''
  : process.env.INFINITEPAY_HANDLE || extractInfinitePayHandle(infinitePaySubscriptionUrl || infinitePayCheckoutUrl);
const infinitePayWebhookUrl =
  process.env.INFINITEPAY_WEBHOOK_URL ||
  `${publicApiBaseUrl.replace(/\/$/, '')}/api/infinitepay/webhook`;
const infinitePayApiBaseUrl =
  (process.env.INFINITEPAY_API_BASE_URL || 'https://api.checkout.infinitepay.io').replace(/\/+$/, '');
const corsOrigins = process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean) || [];
const devCorsOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]);

if (isProduction && corsOrigins.length === 0) {
  throw new Error('CORS_ORIGIN deve ser configurado em producao.');
}

if (!supabaseUrl || !serviceRoleKey) {
  console.warn(
    'Upload API sem SUPABASE_URL/VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY. Endpoints autenticados nao vao funcionar.'
  );
}

const supabase = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxProofSize },
});

if (process.env.TRUST_PROXY_HOPS) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS));
}

app.use(
  cors({
    origin(origin, callback) {
      // Server-to-server requests such as payment webhooks do not send Origin.
      if (!origin) {
        callback(null, true);
        return;
      }
      if (corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      if (!isProduction && devCorsOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      const error = new Error('Origem nao permitida por CORS.');
      error.status = 403;
      callback(error);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use('/uploads', express.static(uploadsRoot, { immutable: true, maxAge: '30d' }));

function requireSupabase() {
  if (!supabase) {
    const error = new Error('API de upload sem Supabase Service Role configurada.');
    error.status = 500;
    throw error;
  }

  return supabase;
}

function publicUrl(filePath) {
  return `${publicBaseUrl}${filePath}`;
}

function privateProofUrl(fileId) {
  return `/api/appointment-files/${fileId}/open`;
}

function safeOriginalName(name = 'arquivo') {
  return name.normalize('NFKD').replace(/[^\w.-]+/g, '-').slice(0, 120) || 'arquivo';
}

function getBearerToken(req) {
  const value = req.headers.authorization || '';
  return value.startsWith('Bearer ') ? value.slice(7) : '';
}

async function getArtistFromToken(req) {
  const client = requireSupabase();
  const token = getBearerToken(req);
  if (!token) {
    const error = new Error('Sessao ausente.');
    error.status = 401;
    throw error;
  }

  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) {
    const error = new Error('Sessao invalida.');
    error.status = 401;
    throw error;
  }

  const { data: artist, error: artistError } = await client
    .from('artist_profiles')
    .select('id, user_id')
    .eq('user_id', userData.user.id)
    .single();

  if (artistError || !artist) {
    const error = new Error('Perfil de tatuador nao encontrado.');
    error.status = 403;
    throw error;
  }

  return { ...artist, email: userData.user.email || '' };
}

async function getUserFromToken(req) {
  const client = requireSupabase();
  const token = getBearerToken(req);
  if (!token) {
    const error = new Error('Sessao ausente.');
    error.status = 401;
    throw error;
  }

  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) {
    const error = new Error('Sessao invalida.');
    error.status = 401;
    throw error;
  }

  return userData.user;
}

async function requirePlatformAdmin(req) {
  const client = requireSupabase();
  const user = await getUserFromToken(req);
  const { data, error } = await client
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) {
    const forbidden = new Error('Apenas administradores podem acessar.');
    forbidden.status = 403;
    throw forbidden;
  }

  return user;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function extractInfinitePayHandle(value = '') {
  try {
    const url = new URL(value);
    const parts = url.pathname.split('/').filter(Boolean);
    if (url.hostname === 'checkout.infinitepay.io') return parts[0] || '';
    if (url.hostname === 'invoice.infinitepay.io' && parts[0] === 'plans') return parts[1] || '';
  } catch {
    return '';
  }
  return '';
}

function optionalObject(condition, value) {
  return condition ? value : {};
}

function normalizeTime(value = '') {
  return String(value).slice(0, 5);
}

function httpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function requiredText(value, label, min, max) {
  const text = String(value || '').trim();
  if (text.length < min || text.length > max) {
    throw httpError(`${label} invalido.`);
  }
  return text;
}

function optionalText(value, label, max) {
  const text = String(value || '').trim();
  if (text.length > max) throw httpError(`${label} invalido.`);
  return text;
}

function assertUuid(value, label) {
  const text = String(value || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) {
    throw httpError(`${label} invalido.`);
  }
  return text;
}

function assertDate(value) {
  const text = String(value || '').trim();
  const date = new Date(`${text}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(text) ||
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== text
  ) {
    throw httpError('Data de agendamento invalida.');
  }
  return text;
}

function assertTime(value) {
  const text = String(value || '').trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(text)) {
    throw httpError('Horario de agendamento invalido.');
  }
  return normalizeTime(text);
}

function assertEmail(value) {
  const text = requiredText(value, 'Email', 5, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) throw httpError('Email invalido.');
  return text;
}

function nullableCoordinate(value, label, minimum, maximum) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || number > maximum) {
    throw httpError(`${label} invalida.`);
  }
  return number;
}

function nonNegativeInteger(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw httpError(`${label} invalido.`);
  return Math.round(number);
}

function assertAccentColor(value) {
  const color = String(value || '').trim();
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw httpError('Cor de destaque invalida.');
  return color;
}

function approximateCoordinate(value) {
  return typeof value === 'number' ? Number(value.toFixed(2)) : null;
}

function hashSecret(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function secretsEqual(left, right) {
  if (!left || !right || left.length !== right.length) return false;
  return crypto.timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

const requestWindows = new Map();

function createRateLimit({ windowMs, max, key }) {
  return (req, res, next) => {
    const bucket = key(req);
    if (!bucket) {
      next();
      return;
    }
    const now = Date.now();
    const entry = requestWindows.get(bucket);
    if (!entry || entry.resetAt <= now) {
      if (requestWindows.size > 10000) {
        for (const [entryKey, current] of requestWindows.entries()) {
          if (current.resetAt <= now) requestWindows.delete(entryKey);
        }
      }
      requestWindows.set(bucket, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    if (entry.count >= max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      res.status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' });
      return;
    }
    entry.count += 1;
    next();
  };
}

const publicAppointmentLimiters = [
  createRateLimit({ windowMs: 15 * 60 * 1000, max: 10, key: (req) => `appointment:ip:${req.ip}` }),
  createRateLimit({ windowMs: 15 * 60 * 1000, max: 10, key: (req) => `appointment:artist:${req.body?.artistId || ''}` }),
  createRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    key: (req) => `appointment:contact:${String(req.body?.clientPhone || req.body?.clientEmail || '').replace(/\s/g, '').toLowerCase()}`,
  }),
];
const proofUploadLimiter = createRateLimit({ windowMs: 15 * 60 * 1000, max: 5, key: (req) => `proof:ip:${req.ip}` });
const likeLimiter = createRateLimit({ windowMs: 15 * 60 * 1000, max: 30, key: (req) => `like:${req.ip}:${req.params.artistId}` });
const geocodeLimiter = createRateLimit({ windowMs: 15 * 60 * 1000, max: 10, key: (req) => `geocode:${req.ip}` });
const reservedSlugs = new Set([
  'admin', 'api', 'login', 'logout', 'dashboard', 'app', 'public', 'profile',
  'profiles', 'settings', 'billing', 'checkout', 'payment', 'payments',
  'webhook', 'health', 'support', 'terms', 'privacy', 'assets', 'static',
  'favicon.ico', 'robots.txt', 'sitemap.xml',
]);

function assertSlug(value) {
  const slug = String(value || '').trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || reservedSlugs.has(slug)) {
    throw httpError('Link publico invalido ou reservado.');
  }
  return slug;
}

function resolvePublicAsset(value = '') {
  if (!value) return '';
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith('/uploads/')) return publicUrl(value);
  return value;
}

function buildCustomSlots(rows = []) {
  return rows.reduce((slots, row) => {
    const dayKey = String(row.weekday);
    slots[dayKey] = [...(slots[dayKey] || []), normalizeTime(row.slot_time)].sort();
    return slots;
  }, {});
}

function buildDateSlots(rows = []) {
  return rows.reduce((slots, row) => {
    slots[row.slot_date] = [...(slots[row.slot_date] || []), normalizeTime(row.slot_time)].sort();
    return slots;
  }, {});
}

function appointmentFromRow(row) {
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
    paymentStatus: row.payment_status,
  };
}

function approvedAppointmentFromRow(row) {
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

async function getLikeStatus(client, artistId, visitorToken = '') {
  const cleanToken = String(visitorToken || 'anon').trim().slice(0, 120) || 'anon';
  const { count, error: countError } = await client
    .from('artist_likes')
    .select('id', { count: 'exact', head: true })
    .eq('artist_id', artistId);
  if (countError) throw countError;

  const { data: liked } = await client
    .from('artist_likes')
    .select('id')
    .eq('artist_id', artistId)
    .eq('visitor_token', cleanToken)
    .maybeSingle();

  return {
    likeCount: count || 0,
    viewerLiked: Boolean(liked),
  };
}

async function buildArtistPayload(client, profile, options = {}) {
  const includePrivateAppointments = Boolean(options.includePrivateAppointments);
  const includePrivateProfileFields = Boolean(options.includePrivateProfileFields);
  const visitorToken = options.visitorToken || '';

  const appointmentsQuery = includePrivateAppointments
    ? client
        .from('appointments')
        .select(
          'id, client_name, client_phone, client_email, appointment_date, appointment_time, description, status, deposit_required, deposit_paid, deposit_credit_used, payment_status, created_at'
        )
        .eq('artist_id', profile.id)
        .order('created_at', { ascending: false })
    : client
        .from('appointments')
        .select('appointment_date, appointment_time')
        .eq('artist_id', profile.id)
        .eq('status', 'approved');

  const [
    { data: pix, error: pixError },
    { data: portfolio, error: portfolioError },
    { data: weeklySlots, error: weeklySlotsError },
    { data: dateSlots, error: dateSlotsError },
    { data: blockedDates, error: blockedDatesError },
    appointmentsResult,
  ] = await Promise.all([
    client
      .from('artist_pix_settings')
      .select('pix_key, pix_type, deposit_value, deposit_required')
      .eq('artist_id', profile.id)
      .maybeSingle(),
    client
      .from('portfolio_photos')
      .select('id, file_path, alt, caption, sort_order')
      .eq('artist_id', profile.id)
      .order('sort_order', { ascending: true }),
    client
      .from('weekly_slots')
      .select('weekday, slot_time')
      .eq('artist_id', profile.id)
      .order('weekday', { ascending: true })
      .order('slot_time', { ascending: true }),
    client
      .from('appointment_slots')
      .select('slot_date, slot_time')
      .eq('artist_id', profile.id)
      .order('slot_date', { ascending: true })
      .order('slot_time', { ascending: true }),
    client.from('blocked_dates').select('blocked_date').eq('artist_id', profile.id),
    appointmentsQuery,
  ]);

  const firstError =
    pixError ||
    portfolioError ||
    weeklySlotsError ||
    dateSlotsError ||
    blockedDatesError ||
    appointmentsResult.error;
  if (firstError) throw firstError;

  const customSlots = buildCustomSlots(weeklySlots || []);
  const availableDays = Object.entries(customSlots)
    .filter(([, slots]) => slots.length > 0)
    .map(([day]) => Number(day))
    .sort();

  const appointments = includePrivateAppointments
    ? (appointmentsResult.data || []).map(appointmentFromRow)
    : (appointmentsResult.data || []).map(approvedAppointmentFromRow);

  if (includePrivateAppointments && appointments.length > 0) {
    const { data: files, error: filesError } = await client
      .from('appointment_files')
      .select('id, appointment_id, file_path')
      .eq('artist_id', profile.id)
      .eq('file_type', 'pix_proof')
      .in(
        'appointment_id',
        appointments.map((appointment) => appointment.id)
      )
      .order('created_at', { ascending: false });
    if (filesError) throw filesError;

    const proofByAppointment = new Map();
    for (const file of files || []) {
      if (!proofByAppointment.has(file.appointment_id)) {
        proofByAppointment.set(
          file.appointment_id,
          file.file_path?.startsWith('/private-uploads/')
            ? `/api/appointment-files/${file.id}/open`
            : file.file_path
        );
      }
    }

    for (const appointment of appointments) {
      const proofPath = proofByAppointment.get(appointment.id);
      if (proofPath) appointment.pixProof = proofPath;
    }
  }

  const likeStatus = await getLikeStatus(client, profile.id, visitorToken);

  return {
    id: profile.id,
    slug: profile.slug,
    artisticName: profile.artistic_name,
    avatar: resolvePublicAsset(profile.avatar_path),
    coverImage: resolvePublicAsset(profile.cover_path),
    bio: profile.bio,
    instagram: profile.instagram,
    whatsapp: profile.whatsapp,
    publicNeighborhood: profile.public_neighborhood || '',
    publicAddressLabel: profile.public_address_label || '',
    city: profile.city,
    state: profile.state,
    styles: profile.styles || [],
    portfolio: (portfolio || []).slice(0, 10).map((photo) => ({
      id: photo.id,
      url: resolvePublicAsset(photo.file_path),
      alt: photo.alt,
      caption: photo.caption || '',
    })),
    pixKey: pix?.pix_key || '',
    pixType: pix?.pix_type || 'phone',
    depositValue: pix?.deposit_value || 0,
    depositRequired: pix?.deposit_required || false,
    availableDays,
    customSlots,
    dateSlots: buildDateSlots(dateSlots || []),
    blockedDates: (blockedDates || []).map((date) => date.blocked_date),
    appointments,
    accentColor: profile.accent_color,
    plan: profile.plan_status,
    likeCount: likeStatus.likeCount,
    viewerLiked: likeStatus.viewerLiked,
    workStart: '10:00',
    workEnd: '19:00',
    lunchStart: '13:00',
    lunchEnd: '14:00',
    ...(includePrivateProfileFields
      ? {
          userId: profile.user_id,
          realName: profile.real_name,
          addressStreet: profile.address_street || '',
          addressNumber: profile.address_number || '',
          addressComplement: profile.address_complement || '',
          neighborhood: profile.neighborhood || '',
          postalCode: profile.postal_code || '',
          latitude: profile.latitude,
          longitude: profile.longitude,
        }
      : {}),
  };
}

function getBillingMonth(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value || String(date.getUTCFullYear());
  const month = parts.find((part) => part.type === 'month')?.value || String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

async function getPlatformMonthlyPriceCents(client) {
  const fallback = Math.max(100, Math.round(platformMonthlyPrice * 100));
  const { data, error } = await client
    .from('platform_settings')
    .select('monthly_price_cents')
    .eq('id', true)
    .maybeSingle();

  if (error) return fallback;
  return Math.max(100, Number(data?.monthly_price_cents || fallback));
}

function activeGrantFromRows(rows = []) {
  const now = Date.now();
  return rows
    .filter((grant) => {
      if (grant.lifetime) return true;
      if (!grant.ends_at) return false;
      return new Date(grant.ends_at).getTime() > now;
    })
    .sort((a, b) => {
      if (a.lifetime !== b.lifetime) return a.lifetime ? -1 : 1;
      const aTime = a.ends_at ? new Date(a.ends_at).getTime() : 0;
      const bTime = b.ends_at ? new Date(b.ends_at).getTime() : 0;
      return bTime - aTime;
    })[0] || null;
}

async function getArtistActiveGrant(client, artistId) {
  const { data, error } = await client
    .from('artist_access_grants')
    .select('ends_at, lifetime, grant_type, note, created_at')
    .eq('artist_id', artistId)
    .lte('starts_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;
  return activeGrantFromRows(data || []);
}

async function artistHasActiveAccess(client, artistId) {
  return Boolean(await getArtistActiveGrant(client, artistId));
}

async function assertArtistHasActiveAccess(client, artistId) {
  if (!(await artistHasActiveAccess(client, artistId))) {
    throw httpError('Seu acesso esta inativo. Regularize a mensalidade para alterar configuracoes.', 403);
  }
}

async function assertPublicArtistAvailable(client, artistId) {
  const { data: artist, error } = await client
    .from('artist_profiles')
    .select('id, plan_status')
    .eq('id', artistId)
    .maybeSingle();

  if (error || !artist || artist.plan_status !== 'active' || !(await artistHasActiveAccess(client, artistId))) {
    const unavailable = new Error('Perfil indisponivel.');
    unavailable.status = 400;
    throw unavailable;
  }

  return artist;
}

function isMissingNotificationsTable(error) {
  const text = `${error?.code || ''} ${error?.message || ''}`.toLowerCase();
  return text.includes('artist_notifications') &&
    (text.includes('pgrst205') || text.includes('schema cache') || text.includes('does not exist') || text.includes('relation'));
}

async function createArtistNotification(client, notification, requireReady = false) {
  const { error } = await client.from('artist_notifications').insert({
    artist_id: notification.artistId,
    type: notification.type,
    title: notification.title,
    message: notification.message || '',
    action: notification.action || '',
    action_ref: notification.actionRef || '',
  });

  if (!error) return true;
  if (isMissingNotificationsTable(error)) {
    if (requireReady) {
      const setupError = new Error(
        'Caixa de mensagens ainda nao ativada. Rode database/artist-notifications.sql no Supabase.'
      );
      setupError.status = 503;
      throw setupError;
    }
    return false;
  }

  if (requireReady) throw error;
  console.error('[notification-error]', error.message || error);
  return false;
}

function normalizeMercadoPagoStatus(status) {
  if (status === 'approved') return 'approved';
  if (status === 'in_process' || status === 'in_mediation') return 'in_process';
  if (status === 'rejected') return 'rejected';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'refunded' || status === 'partially_refunded') return 'refunded';
  if (status === 'charged_back') return 'charged_back';
  return 'pending';
}

function getMercadoPagoAccessToken() {
  return mercadoPagoCheckoutMode === 'sandbox'
    ? mercadoPagoTestAccessToken || mercadoPagoAccessToken
    : mercadoPagoAccessToken;
}

function assertMercadoPagoConfigured() {
  const token = getMercadoPagoAccessToken();

  if (!token) {
    const envName =
      mercadoPagoCheckoutMode === 'sandbox'
        ? 'MERCADO_PAGO_TEST_ACCESS_TOKEN ou MERCADO_PAGO_ACCESS_TOKEN'
        : 'MERCADO_PAGO_ACCESS_TOKEN';
    const error = new Error(`${envName} nao configurado na API.`);
    error.status = 500;
    throw error;
  }

  if (mercadoPagoCheckoutMode === 'production' && token.startsWith('TEST-')) {
    const error = new Error('Use a credencial de producao do Mercado Pago em MERCADO_PAGO_ACCESS_TOKEN.');
    error.status = 500;
    throw error;
  }
}

function isMissingPlatformPaymentsError(error) {
  const message = `${error?.code || ''} ${error?.message || ''}`.toLowerCase();
  return (
    message.includes('pgrst205') ||
    (message.includes('platform_payments') &&
      (message.includes('schema cache') || message.includes('does not exist') || message.includes('relation')))
  );
}

function throwPlatformPaymentsSetupError(error) {
  if (!isMissingPlatformPaymentsError(error)) throw error;

  const setupError = new Error(
    'Banco de assinaturas ainda nao aplicado. Rode database/infinitepay-subscriptions-access.sql no Supabase antes de testar pagamentos.'
  );
  setupError.status = 500;
  setupError.cause = error;
  throw setupError;
}

async function mercadoPagoFetch(pathname, options = {}) {
  assertMercadoPagoConfigured();
  const response = await fetch(`https://api.mercadopago.com${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getMercadoPagoAccessToken()}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || data.error || 'Erro ao consultar Mercado Pago.');
    error.status = response.status;
    error.details = data;
    throw error;
  }
  return data;
}

async function infinitePayFetch(pathname, body) {
  const response = await fetch(`${infinitePayApiBaseUrl}${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    const error = new Error(data.message || data.error || 'Erro ao consultar InfinitePay.');
    error.status = response.status || 400;
    error.details = data;
    throw error;
  }
  return data;
}

function parseMercadoPagoSignature(signatureHeader = '') {
  return signatureHeader.split(',').reduce((acc, item) => {
    const [key, value] = item.split('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
  }, {});
}

function validateMercadoPagoSignature(req, paymentId) {
  if (!mercadoPagoWebhookSecret) return true;

  const signature = parseMercadoPagoSignature(req.headers['x-signature'] || '');
  const requestId = req.headers['x-request-id'] || '';
  if (!signature.ts || !signature.v1 || !requestId || !paymentId) return false;

  const template = `id:${String(paymentId).toLowerCase()};request-id:${requestId};ts:${signature.ts};`;
  const digest = crypto
    .createHmac('sha256', mercadoPagoWebhookSecret)
    .update(template)
    .digest('hex');

  if (digest.length !== signature.v1.length) return false;
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature.v1));
}

async function grantPaidAccess(client, artistId, paymentId) {
  const now = new Date();
  const { data: currentGrant } = await client
    .from('artist_access_grants')
    .select('ends_at')
    .eq('artist_id', artistId)
    .eq('lifetime', false)
    .gt('ends_at', now.toISOString())
    .order('ends_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const baseDate =
    currentGrant?.ends_at && new Date(currentGrant.ends_at) > now
      ? new Date(currentGrant.ends_at)
      : now;
  const endsAt = addDays(baseDate, 30);

  const { error: grantError } = await client.from('artist_access_grants').insert({
    artist_id: artistId,
    grant_type: 'paid_mercado_pago',
    starts_at: now.toISOString(),
    ends_at: endsAt.toISOString(),
    lifetime: false,
    note: `Mercado Pago aprovado - pagamento ${paymentId}`,
  });
  if (grantError) throw grantError;

  const { error: profileError } = await client
    .from('artist_profiles')
    .update({ plan_status: 'active' })
    .eq('id', artistId);
  if (profileError) throw profileError;
}

function assertFile(file) {
  if (!file) {
    const error = new Error('Arquivo nao enviado.');
    error.status = 400;
    throw error;
  }
}

function assertImage(file) {
  assertFile(file);
  if (!file.mimetype.startsWith('image/')) {
    const error = new Error('Envie uma imagem valida.');
    error.status = 400;
    throw error;
  }
  if (file.size > maxImageSize) {
    const error = new Error('Imagem acima do limite permitido.');
    error.status = 413;
    throw error;
  }
}

function assertProof(file) {
  assertFile(file);
  const isImage = file.mimetype.startsWith('image/');
  const isPdf = file.mimetype === 'application/pdf';
  if (!isImage && !isPdf) {
    const error = new Error('Comprovante precisa ser PDF ou imagem.');
    error.status = 400;
    throw error;
  }
}

async function saveWebp(file, folder, width) {
  const internalName = `${crypto.randomUUID()}.webp`;
  const diskFolder = path.join(uploadsRoot, folder);
  const diskPath = path.join(diskFolder, internalName);
  await fs.mkdir(diskFolder, { recursive: true });
  await sharp(file.buffer)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(diskPath);

  return {
    internalName,
    filePath: `/uploads/${folder}/${internalName}`,
    mimeType: 'image/webp',
  };
}

async function saveProof(file, folder) {
  const isImage = file.mimetype.startsWith('image/');
  const extension = isImage ? 'webp' : 'pdf';
  const internalName = `${crypto.randomUUID()}.${extension}`;
  const diskFolder = path.join(privateUploadsRoot, folder);
  const diskPath = path.join(diskFolder, internalName);
  await fs.mkdir(diskFolder, { recursive: true });

  if (isImage) {
    await sharp(file.buffer)
      .rotate()
      .resize({ width: 1800, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(diskPath);
  } else {
    await fs.writeFile(diskPath, file.buffer);
  }

  return {
    internalName,
    filePath: `/private-uploads/${folder}/${internalName}`,
    mimeType: isImage ? 'image/webp' : file.mimetype,
  };
}

function privateDiskPath(filePath) {
  const normalized = filePath.replace(/^\/+/, '');
  if (!normalized.startsWith('private-uploads/')) {
    const error = new Error('Caminho privado invalido.');
    error.status = 400;
    throw error;
  }

  const relativePath = normalized.replace(/^private-uploads\//, '');
  const resolved = path.resolve(privateUploadsRoot, relativePath);
  if (!resolved.startsWith(privateUploadsRoot)) {
    const error = new Error('Caminho privado invalido.');
    error.status = 400;
    throw error;
  }

  return resolved;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/platform-settings/monthly-price', async (_req, res, next) => {
  try {
    const client = requireSupabase();
    const monthlyPriceCents = await getPlatformMonthlyPriceCents(client);
    res.json({
      monthlyPriceCents,
      monthlyPrice: monthlyPriceCents / 100,
    });
  } catch (error) {
    next(error);
  }
});

async function lookupPostalCode(postalCodeValue) {
  const postalCode = String(postalCodeValue || '').replace(/\D/g, '').slice(0, 8);
  if (postalCode.length !== 8) throw httpError('Informe um CEP com 8 digitos.');
  const response = await fetch(`${postalCodeApiBaseUrl}/${postalCode}/json/`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw httpError('Nao foi possivel consultar esse CEP agora.', 502);
  const data = await response.json();
  if (data.erro) throw httpError('CEP nao encontrado. Confira os numeros e tente novamente.', 404);
  return {
    street: String(data.logradouro || '').trim(),
    neighborhood: String(data.bairro || '').trim(),
    city: String(data.localidade || '').trim(),
    stateCode: String(data.uf || '').trim().toUpperCase(),
    postalCode: String(data.cep || '').trim(),
  };
}

async function lookupPostalCoordinates(postalCodeValue) {
  const postalCode = String(postalCodeValue || '').replace(/\D/g, '').slice(0, 8);
  if (postalCode.length !== 8) return null;
  try {
    const response = await fetch(`${postalCoordinatesApiBaseUrl}/${postalCode}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const data = await response.json();
    const rawLatitude = data.location?.coordinates?.latitude;
    const rawLongitude = data.location?.coordinates?.longitude;
    if (rawLatitude === '' || rawLongitude === '' || rawLatitude == null || rawLongitude == null) return null;
    const latitude = Number(rawLatitude);
    const longitude = Number(rawLongitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
  } catch {
    return null;
  }
}

async function geocodeAddress(client, body) {
  const street = optionalText(body?.street, 'Rua', 160);
  const number = optionalText(body?.number, 'Numero', 30);
  const neighborhood = optionalText(body?.neighborhood, 'Bairro', 120);
  const city = optionalText(body?.city, 'Cidade', 120);
  const state = optionalText(body?.state, 'Estado', 80);
  const postalCode = optionalText(body?.postalCode, 'CEP', 20);
  const parts = [[street, number].filter(Boolean).join(', '), neighborhood, city, state, postalCode, 'Brasil']
    .filter(Boolean);
  if (parts.length < 5) {
    throw httpError('Informe o CEP e o numero do estudio para gerar a localizacao.');
  }
  const query = parts.join(', ');
  const queryHash = hashSecret(query.toLowerCase());
  const { data: cached, error: cacheError } = await client
    .from('geocode_cache')
    .select('latitude, longitude')
    .eq('query_hash', queryHash)
    .maybeSingle();
  if (cacheError && !/geocode_cache|schema cache|does not exist/i.test(cacheError.message || '')) {
    throw cacheError;
  }
  if (cached) {
    return { latitude: cached.latitude, longitude: cached.longitude, cached: true };
  }

  const postalCoordinates = await lookupPostalCoordinates(postalCode);
  if (postalCoordinates) {
    const { error: saveError } = await client.from('geocode_cache').upsert({
      query_hash: queryHash,
      query_text: query,
      ...postalCoordinates,
    });
    if (saveError && !/geocode_cache|schema cache|does not exist/i.test(saveError.message || '')) {
      throw saveError;
    }
    return { ...postalCoordinates, cached: false, precision: 'postal_code' };
  }

  const url = new URL(`${geocoderApiBaseUrl}/search`);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'br');
  url.searchParams.set('street', street);
  url.searchParams.set('city', city);
  url.searchParams.set('state', state);
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': process.env.GEOCODER_USER_AGENT || 'TatuApp/1.0 (contato via aplicacao)',
    },
  });
  if (!response.ok) throw httpError('Nao foi possivel consultar esse endereco agora.', 502);
  const result = (await response.json())[0];
  const latitude = Number(result?.lat);
  const longitude = Number(result?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw httpError(
      'CEP confirmado, mas nao consegui calcular a distancia desse endereco. Use sua localizacao para concluir.'
    );
  }
  const { error: saveError } = await client.from('geocode_cache').upsert({
    query_hash: queryHash,
    query_text: query,
    latitude,
    longitude,
  });
  if (saveError && !/geocode_cache|schema cache|does not exist/i.test(saveError.message || '')) {
    throw saveError;
  }
  return { latitude, longitude, cached: false, precision: 'street' };
}

async function reverseGeocodeLocation(body) {
  const latitude = nullableCoordinate(body?.latitude, 'Latitude', -90, 90);
  const longitude = nullableCoordinate(body?.longitude, 'Longitude', -180, 180);
  if (latitude === null || longitude === null) {
    throw httpError('Nao foi possivel identificar a localizacao informada.');
  }
  const url = new URL(`${geocoderApiBaseUrl}/reverse`);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('zoom', '18');
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': process.env.GEOCODER_USER_AGENT || 'TatuApp/1.0 (contato via aplicacao)',
    },
  });
  if (!response.ok) throw httpError('Nao foi possivel localizar esse ponto agora.', 502);
  const data = await response.json();
  const address = data.address || {};
  const stateCode = String(address['ISO3166-2-lvl4'] || '')
    .replace(/^BR-/, '')
    .trim()
    .toUpperCase();
  return {
    street: String(address.road || address.pedestrian || address.residential || '').trim(),
    neighborhood: String(address.suburb || address.neighbourhood || address.quarter || '').trim(),
    city: String(address.city || address.town || address.municipality || address.village || '').trim(),
    state: String(address.state || '').trim(),
    stateCode,
    postalCode: String(address.postcode || '').trim(),
    latitude,
    longitude,
  };
}

app.get('/api/public/location/postal-code/:postalCode', geocodeLimiter, async (req, res, next) => {
  try {
    res.json(await lookupPostalCode(req.params.postalCode));
  } catch (error) {
    next(error);
  }
});

app.post('/api/public/location/geocode', geocodeLimiter, async (req, res, next) => {
  try {
    res.json(await geocodeAddress(requireSupabase(), req.body));
  } catch (error) {
    next(error);
  }
});

app.post('/api/public/location/reverse', geocodeLimiter, async (req, res, next) => {
  try {
    res.json(await reverseGeocodeLocation(req.body));
  } catch (error) {
    next(error);
  }
});

app.get('/api/me/location/postal-code/:postalCode', geocodeLimiter, async (req, res, next) => {
  try {
    const client = requireSupabase();
    const artist = await getArtistFromToken(req);
    await assertArtistHasActiveAccess(client, artist.id);
    res.json(await lookupPostalCode(req.params.postalCode));
  } catch (error) {
    next(error);
  }
});

app.post('/api/me/location/geocode', geocodeLimiter, async (req, res, next) => {
  try {
    const client = requireSupabase();
    const artist = await getArtistFromToken(req);
    await assertArtistHasActiveAccess(client, artist.id);
    res.json(await geocodeAddress(client, req.body));
  } catch (error) {
    next(error);
  }
});

app.get('/api/platform-payments', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const artist = await getArtistFromToken(req);
    const { data, error } = await client
      .from('platform_payments')
      .select(
        'id, provider, external_reference, provider_preference_id, provider_payment_id, status, amount_cents, currency, checkout_url, raw_payload, paid_at, created_at, updated_at'
      )
      .eq('artist_id', artist.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    res.json({ payments: data || [] });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/is-platform-admin', async (req, res, next) => {
  try {
    await requirePlatformAdmin(req);
    res.json({ isAdmin: true });
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      res.json({ isAdmin: false });
      return;
    }
    next(error);
  }
});

app.get('/api/admin/artists', async (req, res, next) => {
  try {
    const client = requireSupabase();
    await requirePlatformAdmin(req);

    const { data: profiles, error: profilesError } = await client
      .from('artist_profiles')
      .select('id, user_id, slug, artistic_name, real_name, instagram, whatsapp, city, state, latitude, longitude, plan_status, created_at')
      .order('created_at', { ascending: false });
    if (profilesError) throw profilesError;

    const { data: grants, error: grantsError } = await client
      .from('artist_access_grants')
      .select('artist_id, ends_at, lifetime, grant_type, note, created_at')
      .lte('starts_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    if (grantsError) throw grantsError;

    const { data: usersData } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const emailByUserId = new Map((usersData?.users || []).map((user) => [user.id, user.email || '']));
    const grantsByArtist = (grants || []).reduce((map, grant) => {
      map.set(grant.artist_id, [...(map.get(grant.artist_id) || []), grant]);
      return map;
    }, new Map());

    res.json({
      artists: (profiles || []).map((profile) => {
        const activeGrant = activeGrantFromRows(grantsByArtist.get(profile.id) || []);
        return {
          artist_id: profile.id,
          user_id: profile.user_id,
          email: emailByUserId.get(profile.user_id) || '',
          slug: profile.slug,
          artistic_name: profile.artistic_name,
          real_name: profile.real_name,
          instagram: profile.instagram,
          whatsapp: profile.whatsapp,
          city: profile.city,
          state: profile.state,
          latitude: profile.latitude,
          longitude: profile.longitude,
          plan_status: profile.plan_status,
          created_at: profile.created_at,
          access_until: activeGrant?.ends_at || null,
          access_lifetime: Boolean(activeGrant?.lifetime),
          access_source: activeGrant?.grant_type || 'none',
          latest_grant_note: activeGrant?.note || '',
        };
      }),
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/artists/:artistId/block', async (req, res, next) => {
  try {
    const client = requireSupabase();
    await requirePlatformAdmin(req);
    const artistId = assertUuid(req.params.artistId, 'Artista');
    const blocked = Boolean(req.body?.blocked);
    const { error } = await client
      .from('artist_profiles')
      .update({ plan_status: blocked ? 'blocked' : 'active' })
      .eq('id', artistId);
    if (error) throw error;

    if (blocked) {
      await createArtistNotification(client, {
        artistId,
        type: 'billing',
        title: 'Mensalidade vencida',
        message: 'Regularize o pagamento para reativar seu perfil público e agenda.',
        action: 'payments',
      });
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/artists/:artistId/notifications', async (req, res, next) => {
  try {
    const client = requireSupabase();
    await requirePlatformAdmin(req);
    const artistId = assertUuid(req.params.artistId, 'Artista');
    const title = String(req.body?.title || 'Mensagem do suporte').trim().slice(0, 100);
    const message = String(req.body?.message || '').trim().slice(0, 500);
    if (!message) {
      const error = new Error('Digite uma mensagem para o profissional.');
      error.status = 400;
      throw error;
    }

    await createArtistNotification(
      client,
      {
        artistId,
        type: 'support',
        title,
        message,
      },
      true
    );
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/artists/:artistId/grants', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const user = await requirePlatformAdmin(req);
    const artistId = assertUuid(req.params.artistId, 'Artista');
    const lifetime = Boolean(req.body?.lifetime);
    const grantType = lifetime ? 'lifetime' : req.body?.grantType || 'manual_free';
    const endsAt = lifetime ? null : String(req.body?.endsAt || '').trim() || null;

    if (!lifetime && !endsAt) {
      const error = new Error('Informe uma data final ou marque acesso vitalicio.');
      error.status = 400;
      throw error;
    }
    if (endsAt && (Number.isNaN(new Date(endsAt).getTime()) || new Date(endsAt).getTime() <= Date.now())) {
      throw httpError('Data final da liberacao invalida.');
    }

    const allowedGrantTypes = new Set([
      'trial',
      'manual_free',
      'paid_pix',
      'paid_mercado_pago',
      'paid_infinitepay',
      'lifetime',
      'self_grace',
    ]);
    if (!allowedGrantTypes.has(grantType)) {
      const error = new Error('Tipo de liberacao invalido.');
      error.status = 400;
      throw error;
    }

    const { data, error } = await client
      .from('artist_access_grants')
      .insert({
        artist_id: artistId,
        grant_type: grantType,
        ends_at: endsAt,
        lifetime,
        note: optionalText(req.body?.note, 'Observacao', 500),
        created_by: user.id,
      })
      .select('id')
      .single();
    if (error) throw error;

    await client.from('artist_profiles').update({ plan_status: 'active' }).eq('id', artistId);
    res.json({ id: data.id });
  } catch (error) {
    next(error);
  }
});

app.put('/api/admin/platform-settings/monthly-price', async (req, res, next) => {
  try {
    const client = requireSupabase();
    await requirePlatformAdmin(req);
    const monthlyPriceCents = Number(req.body?.monthlyPriceCents);
    if (!Number.isInteger(monthlyPriceCents) || monthlyPriceCents < 100) {
      throw httpError('Preco mensal invalido.');
    }
    const { error } = await client
      .from('platform_settings')
      .update({ monthly_price_cents: monthlyPriceCents, updated_at: new Date().toISOString() })
      .eq('id', true);
    if (error) throw error;
    res.json({ monthlyPriceCents });
  } catch (error) {
    next(error);
  }
});

app.get('/api/artists/:artistId/access-status', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const user = await getUserFromToken(req);
    const artistId = assertUuid(req.params.artistId, 'Artista');
    const { data: profile, error: profileError } = await client
      .from('artist_profiles')
      .select('id, user_id')
      .eq('id', artistId)
      .maybeSingle();
    if (profileError || !profile) {
      const error = new Error('Perfil nao encontrado.');
      error.status = 404;
      throw error;
    }

    const { data: adminRecord } = await client
      .from('platform_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (profile.user_id !== user.id && !adminRecord) {
      const error = new Error('Acesso negado.');
      error.status = 403;
      throw error;
    }

    const activeGrant = await getArtistActiveGrant(client, artistId);
    res.json({
      has_access: Boolean(activeGrant),
      access_until: activeGrant?.ends_at || null,
      lifetime: Boolean(activeGrant?.lifetime),
      source: activeGrant?.grant_type || 'none',
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/artists/:artistId/grace/can', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const artist = await getArtistFromToken(req);
    const artistId = assertUuid(req.params.artistId, 'Artista');
    if (artist.id !== artistId) {
      const error = new Error('Acesso negado.');
      error.status = 403;
      throw error;
    }

    const monthStart = `${getBillingMonth()}-01T00:00:00.000Z`;
    const hasActiveAccess = await artistHasActiveAccess(client, artist.id);
    const { data: usedGrace } = await client
      .from('artist_access_grants')
      .select('id')
      .eq('artist_id', artist.id)
      .eq('grant_type', 'self_grace')
      .gte('created_at', monthStart)
      .limit(1)
      .maybeSingle();

    res.json({ canClaim: !hasActiveAccess && !usedGrace });
  } catch (error) {
    next(error);
  }
});

app.post('/api/artists/:artistId/grace/claim', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const artist = await getArtistFromToken(req);
    const artistId = assertUuid(req.params.artistId, 'Artista');
    if (artist.id !== artistId) {
      const error = new Error('Acesso negado.');
      error.status = 403;
      throw error;
    }

    const monthStart = `${getBillingMonth()}-01T00:00:00.000Z`;
    const hasActiveAccess = await artistHasActiveAccess(client, artist.id);
    const { data: usedGrace } = await client
      .from('artist_access_grants')
      .select('id')
      .eq('artist_id', artist.id)
      .eq('grant_type', 'self_grace')
      .gte('created_at', monthStart)
      .limit(1)
      .maybeSingle();
    if (hasActiveAccess || usedGrace) {
      const error = new Error('Desbloqueio temporario indisponivel para esta conta.');
      error.status = 400;
      throw error;
    }

    const endsAt = addDays(new Date(), 5).toISOString();
    const { error: grantError } = await client.from('artist_access_grants').insert({
      artist_id: artist.id,
      grant_type: 'self_grace',
      starts_at: new Date().toISOString(),
      ends_at: endsAt,
      lifetime: false,
      note: 'Desbloqueio temporario solicitado pelo tatuador - 5 dias',
    });
    if (grantError) throw grantError;
    await client.from('artist_profiles').update({ plan_status: 'active' }).eq('id', artist.id);
    res.json({ endsAt });
  } catch (error) {
    next(error);
  }
});

app.get('/api/public/artists/:artistId/likes', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const artistId = assertUuid(req.params.artistId, 'Artista');
    await assertPublicArtistAvailable(client, artistId);
    const visitorToken = String(req.query.visitorToken || 'anon').trim() || 'anon';
    const { count, error: countError } = await client
      .from('artist_likes')
      .select('id', { count: 'exact', head: true })
      .eq('artist_id', artistId);
    if (countError) throw countError;
    const { data: liked } = await client
      .from('artist_likes')
      .select('id')
      .eq('artist_id', artistId)
      .eq('visitor_token', visitorToken)
      .maybeSingle();
    res.json({ like_count: count || 0, viewer_liked: Boolean(liked) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/public/artists/:artistId/likes/toggle', likeLimiter, async (req, res, next) => {
  try {
    const client = requireSupabase();
    const artistId = assertUuid(req.params.artistId, 'Artista');
    await assertPublicArtistAvailable(client, artistId);
    const visitorToken = String(req.body?.visitorToken || 'anon').trim().slice(0, 120) || 'anon';
    const { data: liked } = await client
      .from('artist_likes')
      .select('id')
      .eq('artist_id', artistId)
      .eq('visitor_token', visitorToken)
      .maybeSingle();

    if (liked) {
      const { error } = await client
        .from('artist_likes')
        .delete()
        .eq('artist_id', artistId)
        .eq('visitor_token', visitorToken);
      if (error) throw error;
    } else {
      const { error } = await client
        .from('artist_likes')
        .insert({ artist_id: artistId, visitor_token: visitorToken });
      if (error) throw error;
      await createArtistNotification(client, {
        artistId,
        type: 'like',
        title: 'Alguém curtiu seu perfil',
        message: 'Seu trabalho recebeu uma nova curtida.',
        action: 'profile',
      });
    }

    const { count } = await client
      .from('artist_likes')
      .select('id', { count: 'exact', head: true })
      .eq('artist_id', artistId);
    res.json({ like_count: count || 0, viewer_liked: !liked });
  } catch (error) {
    next(error);
  }
});

app.get('/api/public/profiles/:slug/approved-slots', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const slug = assertSlug(req.params.slug);
    const { data: profile, error: profileError } = await client
      .from('artist_profiles')
      .select('id, plan_status')
      .eq('slug', slug)
      .maybeSingle();
    if (profileError || !profile || profile.plan_status !== 'active' || !(await artistHasActiveAccess(client, profile.id))) {
      res.json({ slots: [] });
      return;
    }

    const { data, error } = await client
      .from('appointments')
      .select('appointment_date, appointment_time')
      .eq('artist_id', profile.id)
      .eq('status', 'approved');
    if (error) throw error;
    res.json({ slots: data || [] });
  } catch (error) {
    next(error);
  }
});

app.post('/api/public/appointments', publicAppointmentLimiters, async (req, res, next) => {
  try {
    const client = requireSupabase();
    if (String(req.body?.website || '').trim()) {
      res.status(200).json({ ok: true });
      return;
    }

    const artistId = assertUuid(req.body?.artistId, 'Artista');
    await assertPublicArtistAvailable(client, artistId);

    const clientName = requiredText(req.body?.clientName, 'Nome', 2, 120);
    const clientPhone = requiredText(req.body?.clientPhone, 'Telefone', 8, 30);
    const clientEmail = assertEmail(req.body?.clientEmail);
    const description = optionalText(req.body?.description, 'Descricao', 1000);
    const appointmentDate = assertDate(req.body?.date);
    const appointmentTime = assertTime(req.body?.time);
    if (new Date(`${appointmentDate}T00:00:00`) < new Date(new Date().toDateString())) {
      const error = new Error('Data de agendamento invalida.');
      error.status = 400;
      throw error;
    }

    const { data: blockedDate } = await client
      .from('blocked_dates')
      .select('id')
      .eq('artist_id', artistId)
      .eq('blocked_date', appointmentDate)
      .maybeSingle();
    if (blockedDate) {
      const error = new Error('Data bloqueada pelo tatuador.');
      error.status = 400;
      throw error;
    }

    const { data: anyDateSlot } = await client
      .from('appointment_slots')
      .select('id')
      .eq('artist_id', artistId)
      .limit(1)
      .maybeSingle();
    if (anyDateSlot) {
      const { data: slot } = await client
        .from('appointment_slots')
        .select('id')
        .eq('artist_id', artistId)
        .eq('slot_date', appointmentDate)
        .eq('slot_time', appointmentTime)
        .maybeSingle();
      if (!slot) {
        const error = new Error('Horario indisponivel na agenda do tatuador.');
        error.status = 400;
        throw error;
      }
    } else {
      const weekday = new Date(`${appointmentDate}T00:00:00`).getDay();
      const { data: slot } = await client
        .from('weekly_slots')
        .select('id')
        .eq('artist_id', artistId)
        .eq('weekday', weekday)
        .eq('slot_time', appointmentTime)
        .maybeSingle();
      if (!slot) {
        const error = new Error('Horario indisponivel na agenda do tatuador.');
        error.status = 400;
        throw error;
      }
    }

    const { data: approvedConflict } = await client
      .from('appointments')
      .select('id')
      .eq('artist_id', artistId)
      .eq('appointment_date', appointmentDate)
      .eq('appointment_time', appointmentTime)
      .eq('status', 'approved')
      .maybeSingle();
    if (approvedConflict) {
      const error = new Error('Horario ja confirmado.');
      error.status = 400;
      throw error;
    }

    const { data: pix } = await client
      .from('artist_pix_settings')
      .select('deposit_required, deposit_value')
      .eq('artist_id', artistId)
      .maybeSingle();
    const depositRequired = Boolean(pix?.deposit_required);
    const depositValue = Number(pix?.deposit_value || 0);
    const paymentStatus = depositRequired ? 'pending_proof' : 'not_required';
    const uploadToken = crypto.randomBytes(32).toString('base64url');
    const uploadTokenHash = hashSecret(uploadToken);
    const uploadTokenExpiresAt = addDays(new Date(), 7).toISOString();

    const { data, error } = await client
      .from('appointments')
      .insert({
        artist_id: artistId,
        client_name: clientName,
        client_phone: clientPhone,
        client_email: clientEmail,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        description,
        status: 'pending',
        deposit_required: depositRequired,
        deposit_value: depositValue,
        deposit_paid: false,
        deposit_credit_used: false,
        payment_status: paymentStatus,
        proof_upload_token_hash: depositRequired ? uploadTokenHash : null,
        proof_upload_token_expires_at: depositRequired ? uploadTokenExpiresAt : null,
      })
      .select('id, created_at')
      .single();
    if (error) throw error;

    await createArtistNotification(client, {
      artistId,
      type: 'appointment',
      title: 'Novo agendamento',
      message: `${clientName} solicitou ${appointmentDate} às ${normalizeTime(appointmentTime)}.`,
      action: 'appointments',
      actionRef: data.id,
    });

    res.json({
      ...data,
      depositRequired,
      depositPaid: false,
      depositCreditUsed: false,
      paymentStatus,
      proofUploadToken: depositRequired ? uploadToken : '',
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/public/artists', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const visitorToken = String(req.query.visitorToken || '');
    const { data: profiles, error } = await client.rpc('list_public_artists_for_api', {
      p_visitor_token: visitorToken.slice(0, 120),
    });
    if (error) {
      if (/list_public_artists_for_api|schema cache|does not exist/i.test(error.message || '')) {
        throw httpError(
          'Ative database/booking-payment-security-fixes.sql antes de abrir a pesquisa.',
          503
        );
      }
      throw error;
    }
    res.json({
      artists: (profiles || []).map((profile) => ({
        id: profile.id,
        slug: profile.slug,
        artisticName: profile.artistic_name,
        avatar: resolvePublicAsset(profile.avatar_path),
        coverImage: resolvePublicAsset(profile.cover_path),
        bio: profile.bio,
        instagram: profile.instagram,
        publicNeighborhood: profile.public_neighborhood || '',
        publicAddressLabel: profile.public_address_label || '',
        city: profile.city,
        state: profile.state,
        latitude: approximateCoordinate(profile.latitude),
        longitude: approximateCoordinate(profile.longitude),
        styles: profile.styles || [],
        accentColor: profile.accent_color,
        createdAt: profile.created_at,
        likeCount: Number(profile.like_count || 0),
        featuredImage: '',
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/public/profiles/:slug', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const slug = assertSlug(req.params.slug);
    const { data: profile, error } = await client
      .from('artist_profiles')
      .select(
        'id, slug, artistic_name, avatar_path, cover_path, bio, instagram, whatsapp, public_neighborhood, public_address_label, city, state, styles, accent_color, plan_status'
      )
      .eq('slug', slug)
      .eq('plan_status', 'active')
      .maybeSingle();
    if (error) throw error;
    if (!profile || !(await artistHasActiveAccess(client, profile.id))) {
      res.status(404).json({ error: 'Perfil nao encontrado.' });
      return;
    }

    const artist = await buildArtistPayload(client, profile, {
      visitorToken: req.query.visitorToken,
    });
    res.json({ artist });
  } catch (error) {
    next(error);
  }
});

app.get('/api/me/artist', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const artist = await getArtistFromToken(req);
    const { data: profile, error } = await client
      .from('artist_profiles')
      .select(
        'id, user_id, slug, artistic_name, real_name, avatar_path, cover_path, bio, instagram, whatsapp, address_street, address_number, address_complement, neighborhood, postal_code, public_neighborhood, public_address_label, city, state, latitude, longitude, styles, accent_color, plan_status'
      )
      .eq('id', artist.id)
      .maybeSingle();
    if (error) throw error;
    if (!profile) {
      res.status(404).json({ error: 'Perfil de tatuador nao encontrado.' });
      return;
    }

    res.json({
      artist: await buildArtistPayload(client, profile, {
        includePrivateAppointments: true,
        includePrivateProfileFields: true,
      }),
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/me/notifications', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const artist = await getArtistFromToken(req);
    const { data, error } = await client
      .from('artist_notifications')
      .select('id, type, title, message, action, action_ref, read_at, created_at')
      .eq('artist_id', artist.id)
      .order('created_at', { ascending: false })
      .limit(40);
    if (error && isMissingNotificationsTable(error)) {
      res.json({ notifications: [] });
      return;
    }
    if (error) throw error;
    res.json({ notifications: data || [] });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/me/notifications/:notificationId/read', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const artist = await getArtistFromToken(req);
    const notificationId = assertUuid(req.params.notificationId, 'Notificacao');
    const { error } = await client
      .from('artist_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('artist_id', artist.id);
    if (error && isMissingNotificationsTable(error)) {
      res.json({ ok: true });
      return;
    }
    if (error) throw error;
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/me/notifications/read-all', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const artist = await getArtistFromToken(req);
    const { error } = await client
      .from('artist_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('artist_id', artist.id)
      .is('read_at', null);
    if (error && isMissingNotificationsTable(error)) {
      res.json({ ok: true });
      return;
    }
    if (error) throw error;
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/me/artist', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const user = await getUserFromToken(req);
    const { data: existing } = await client
      .from('artist_profiles')
      .select(
        'id, user_id, slug, artistic_name, real_name, avatar_path, cover_path, bio, instagram, whatsapp, address_street, address_number, address_complement, neighborhood, postal_code, public_neighborhood, public_address_label, city, state, latitude, longitude, styles, accent_color, plan_status'
      )
      .eq('user_id', user.id)
      .maybeSingle();
    if (existing) {
      res.json({
        artist: await buildArtistPayload(client, existing, {
          includePrivateAppointments: true,
          includePrivateProfileFields: true,
        }),
      });
      return;
    }

    const body = req.body || {};
    const cleanName = requiredText(body.artisticName || user.email?.split('@')[0] || 'Artista', 'Nome artistico', 2, 120);
    const slugBase = cleanName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `artista-${user.id.slice(0, 8)}`;

    const { data: profile, error } = await client
      .from('artist_profiles')
      .insert({
        user_id: user.id,
        slug: `${slugBase}-${user.id.slice(0, 6)}`,
        artistic_name: cleanName,
        real_name: cleanName,
        whatsapp: optionalText(body.whatsapp, 'WhatsApp', 30),
        address_street: optionalText(body.addressStreet, 'Rua', 160),
        address_number: optionalText(body.addressNumber, 'Numero', 30),
        address_complement: optionalText(body.addressComplement, 'Complemento', 120),
        neighborhood: optionalText(body.neighborhood, 'Bairro', 120),
        postal_code: optionalText(body.postalCode, 'CEP', 20),
        public_neighborhood: optionalText(body.publicNeighborhood || body.neighborhood, 'Bairro publico', 120),
        public_address_label: optionalText(
          body.publicAddressLabel || [body.neighborhood, body.city].filter(Boolean).join(', '),
          'Localizacao publica',
          160
        ),
        city: optionalText(body.city, 'Cidade', 120),
        state: optionalText(body.state, 'Estado', 80),
        latitude: nullableCoordinate(body.latitude, 'Latitude', -90, 90),
        longitude: nullableCoordinate(body.longitude, 'Longitude', -180, 180),
        styles: [],
        bio: '',
        avatar_path: '',
        cover_path: '',
        accent_color: '#a855f7',
        plan_status: 'active',
      })
      .select(
        'id, user_id, slug, artistic_name, real_name, avatar_path, cover_path, bio, instagram, whatsapp, address_street, address_number, address_complement, neighborhood, postal_code, public_neighborhood, public_address_label, city, state, latitude, longitude, styles, accent_color, plan_status'
      )
      .single();
    if (error) throw error;

    await client.from('artist_pix_settings').upsert({
      artist_id: profile.id,
      pix_key: '',
      pix_type: 'phone',
      deposit_value: 150,
      deposit_required: true,
    });

    res.json({
      artist: await buildArtistPayload(client, profile, {
        includePrivateAppointments: true,
        includePrivateProfileFields: true,
      }),
    });
  } catch (error) {
    next(error);
  }
});

app.put('/api/me/artist/:artistId', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const artist = await getArtistFromToken(req);
    const artistId = assertUuid(req.params.artistId, 'Artista');
    if (artist.id !== artistId) {
      const error = new Error('Acesso negado.');
      error.status = 403;
      throw error;
    }
    await assertArtistHasActiveAccess(client, artist.id);

    const body = req.body || {};
    const profileUpdate = {
      slug: assertSlug(body.slug),
      artistic_name: requiredText(body.artisticName, 'Nome artistico', 2, 120),
      real_name: optionalText(body.realName || body.artisticName, 'Nome', 120),
      bio: optionalText(body.bio, 'Bio', 1000),
      instagram: optionalText(body.instagram, 'Instagram', 80),
      whatsapp: optionalText(body.whatsapp, 'WhatsApp', 30),
      address_street: optionalText(body.addressStreet, 'Rua', 160),
      address_number: optionalText(body.addressNumber, 'Numero', 30),
      address_complement: optionalText(body.addressComplement, 'Complemento', 120),
      neighborhood: optionalText(body.neighborhood, 'Bairro', 120),
      postal_code: optionalText(body.postalCode, 'CEP', 20),
      public_neighborhood: optionalText(body.publicNeighborhood || body.neighborhood, 'Bairro publico', 120),
      public_address_label: optionalText(
        body.publicAddressLabel ||
          [body.publicNeighborhood || body.neighborhood, body.city].filter(Boolean).join(', '),
        'Localizacao publica',
        160
      ),
      city: optionalText(body.city, 'Cidade', 120),
      state: optionalText(body.state, 'Estado', 80),
      latitude: nullableCoordinate(body.latitude, 'Latitude', -90, 90),
      longitude: nullableCoordinate(body.longitude, 'Longitude', -180, 180),
      styles: Array.isArray(body.styles) ? body.styles.slice(0, 20).map((style) => optionalText(style, 'Estilo', 40)) : [],
      accent_color: body.accentColor ? assertAccentColor(body.accentColor) : '#a855f7',
    };

    if (!body.avatar || String(body.avatar).startsWith('/uploads/') || /^https?:/i.test(String(body.avatar))) {
      profileUpdate.avatar_path = body.avatar || '';
      profileUpdate.avatar_source = body.avatar ? (String(body.avatar).startsWith('/uploads/') ? 'upload' : 'external_url') : 'upload';
    }
    if (!body.coverImage || String(body.coverImage).startsWith('/uploads/') || /^https?:/i.test(String(body.coverImage))) {
      profileUpdate.cover_path = body.coverImage || '';
      profileUpdate.cover_source = body.coverImage ? (String(body.coverImage).startsWith('/uploads/') ? 'upload' : 'external_url') : 'upload';
    }

    const weeklySlotRows = Object.entries(body.customSlots || {}).flatMap(([weekday, slots]) =>
      (slots || []).map((slot) => ({ weekday: Number(weekday), slot_time: assertTime(slot) }))
    );
    const dateSlotRows = Object.entries(body.dateSlots || {}).flatMap(([slotDate, slots]) =>
      (slots || []).map((slot) => ({ slot_date: assertDate(slotDate), slot_time: assertTime(slot) }))
    );
    const blockedDateRows = (body.blockedDates || []).map((blockedDate) => ({
      blocked_date: assertDate(blockedDate),
    }));
    const portfolioRows = (body.portfolio || [])
      .filter((photo) => photo.id && !String(photo.id).startsWith('p'))
      .map((photo, index) => ({
        id: assertUuid(photo.id, 'Foto'),
        caption: optionalText(photo.caption, 'Legenda', 500),
        alt: optionalText(photo.alt || photo.caption, 'Descricao da foto', 500),
        sort_order: index,
      }));

    const { error: saveError } = await client.rpc('save_artist_settings_transactional', {
      p_artist_id: artist.id,
      p_profile: profileUpdate,
      p_pix: {
        pix_key: optionalText(body.pixKey, 'Chave Pix', 180),
        pix_type: ['cpf', 'cnpj', 'email', 'phone', 'random'].includes(body.pixType) ? body.pixType : 'phone',
        deposit_value: nonNegativeInteger(body.depositValue || 0, 'Valor do sinal'),
        deposit_required: body.depositRequired !== false,
      },
      p_weekly_slots: weeklySlotRows,
      p_date_slots: dateSlotRows,
      p_blocked_dates: blockedDateRows,
      p_portfolio: portfolioRows,
    });
    if (saveError) {
      if (/save_artist_settings_transactional|schema cache|does not exist/i.test(saveError.message || '')) {
        throw httpError(
          'Ative database/booking-payment-security-fixes.sql antes de salvar perfil e agenda.',
          503
        );
      }
      if (saveError.code === '23505' && /slug|artist_profiles_slug/i.test(saveError.message || '')) {
        throw httpError('Este link publico ja esta em uso. Escolha outro.', 409);
      }
      throw saveError;
    }

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/me/appointments/:appointmentId/status', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const artist = await getArtistFromToken(req);
    await assertArtistHasActiveAccess(client, artist.id);
    const appointmentId = assertUuid(req.params.appointmentId, 'Reserva');
    const status = String(req.body?.status || '');
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      throw httpError('Status do agendamento invalido.');
    }
    const { data: appointment, error: appointmentError } = await client
      .from('appointments')
      .select('deposit_required, deposit_credit_used, payment_status')
      .eq('id', appointmentId)
      .eq('artist_id', artist.id)
      .maybeSingle();
    if (appointmentError) throw appointmentError;
    if (!appointment) throw httpError('Agendamento nao encontrado.', 404);
    if (
      status === 'approved' &&
      appointment.deposit_required &&
      !appointment.deposit_credit_used &&
      appointment.payment_status !== 'paid_confirmed'
    ) {
      throw httpError('Confira e aprove o comprovante antes de confirmar o horario.');
    }
    const { error } = await client
      .from('appointments')
      .update({ status })
      .eq('id', appointmentId)
      .eq('artist_id', artist.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/me/appointments/:appointmentId/schedule', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const artist = await getArtistFromToken(req);
    await assertArtistHasActiveAccess(client, artist.id);
    const appointmentId = assertUuid(req.params.appointmentId, 'Reserva');
    const appointmentDate = assertDate(req.body?.date);
    const appointmentTime = assertTime(req.body?.time);
    if (new Date(`${appointmentDate}T00:00:00`) < new Date(new Date().toDateString())) {
      throw httpError('Data de agendamento invalida.');
    }
    const { error } = await client
      .from('appointments')
      .update({ appointment_date: appointmentDate, appointment_time: appointmentTime })
      .eq('id', appointmentId)
      .eq('artist_id', artist.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/me/appointments/:appointmentId/proof/approve', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const artist = await getArtistFromToken(req);
    await assertArtistHasActiveAccess(client, artist.id);
    const appointmentId = assertUuid(req.params.appointmentId, 'Reserva');
    const { data, error } = await client
      .from('appointments')
      .update({
        deposit_paid: true,
        payment_status: 'paid_confirmed',
        proof_reviewed_at: new Date().toISOString(),
        proof_reviewed_by: artist.user_id,
        proof_rejection_reason: '',
      })
      .eq('id', appointmentId)
      .eq('artist_id', artist.id)
      .eq('payment_status', 'proof_sent')
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw httpError('Comprovante pendente nao encontrado.', 400);
    res.json({ ok: true, paymentStatus: 'paid_confirmed', depositPaid: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/me/appointments/:appointmentId/proof/reject', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const artist = await getArtistFromToken(req);
    await assertArtistHasActiveAccess(client, artist.id);
    const appointmentId = assertUuid(req.params.appointmentId, 'Reserva');
    const reason = optionalText(req.body?.reason, 'Motivo', 300);
    const { data, error } = await client
      .from('appointments')
      .update({
        deposit_paid: false,
        payment_status: 'proof_rejected',
        proof_reviewed_at: new Date().toISOString(),
        proof_reviewed_by: artist.user_id,
        proof_rejection_reason: reason,
      })
      .eq('id', appointmentId)
      .eq('artist_id', artist.id)
      .in('payment_status', ['proof_sent', 'paid_confirmed'])
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw httpError('Comprovante para rejeicao nao encontrado.', 400);
    res.json({ ok: true, paymentStatus: 'proof_rejected', depositPaid: false });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/appointments/:appointmentId/proof/:decision', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const user = await requirePlatformAdmin(req);
    const appointmentId = assertUuid(req.params.appointmentId, 'Reserva');
    const decision = String(req.params.decision || '');
    if (!['approve', 'reject'].includes(decision)) {
      throw httpError('Decisao de comprovante invalida.');
    }
    const approve = decision === 'approve';
    const { data, error } = await client
      .from('appointments')
      .update({
        deposit_paid: approve,
        payment_status: approve ? 'paid_confirmed' : 'proof_rejected',
        proof_reviewed_at: new Date().toISOString(),
        proof_reviewed_by: user.id,
        proof_rejection_reason: approve ? '' : optionalText(req.body?.reason, 'Motivo', 300),
      })
      .eq('id', appointmentId)
      .in('payment_status', approve ? ['proof_sent'] : ['proof_sent', 'paid_confirmed'])
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw httpError('Comprovante para revisao nao encontrado.', 400);
    res.json({
      ok: true,
      paymentStatus: approve ? 'paid_confirmed' : 'proof_rejected',
      depositPaid: approve,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/platform-payments/checkout', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const artist = await getArtistFromToken(req);
    const amountCents = await getPlatformMonthlyPriceCents(client);

    const { data: payment, error: paymentError } = await client
      .from('platform_payments')
      .insert({
        artist_id: artist.id,
        provider: 'mercado_pago',
        external_reference: crypto.randomUUID(),
        status: 'pending',
        amount_cents: amountCents,
        currency: 'BRL',
      })
      .select('id, external_reference')
      .single();

    if (paymentError) throwPlatformPaymentsSetupError(paymentError);

    const notificationUrl = `${publicApiBaseUrl.replace(/\/$/, '')}/api/mercado-pago/webhook?source_news=webhooks`;
    const appUrl = publicAppUrl.replace(/\/$/, '');
    const preference = await mercadoPagoFetch('/checkout/preferences', {
      method: 'POST',
      body: JSON.stringify({
        items: [
          {
            id: 'tatuapp-monthly',
            title: 'Mensalidade TatuApp',
            description: 'Acesso mensal ao painel e perfil publico do TatuApp',
            quantity: 1,
            unit_price: amountCents / 100,
            currency_id: 'BRL',
          },
        ],
        ...optionalObject(mercadoPagoCheckoutMode === 'production' && artist.email, {
          payer: {
            email: artist.email,
          },
        }),
        external_reference: payment.external_reference,
        notification_url: notificationUrl,
        back_urls: {
          success: `${appUrl}/?billing=success`,
          failure: `${appUrl}/?billing=failure`,
          pending: `${appUrl}/?billing=pending`,
        },
        auto_return: 'approved',
        metadata: {
          artist_id: artist.id,
          platform_payment_id: payment.id,
        },
      }),
    });

    const { error: updateError } = await client
      .from('platform_payments')
      .update({
        provider_preference_id: preference.id || '',
        checkout_url: preference.init_point || '',
        sandbox_checkout_url: preference.sandbox_init_point || '',
        raw_payload: preference,
      })
      .eq('id', payment.id);

    if (updateError) throwPlatformPaymentsSetupError(updateError);

    res.json({
      id: payment.id,
      externalReference: payment.external_reference,
      preferenceId: preference.id,
      checkoutUrl:
        mercadoPagoCheckoutMode === 'sandbox'
          ? preference.sandbox_init_point || preference.init_point
          : preference.init_point,
      productionCheckoutUrl: preference.init_point,
      sandboxCheckoutUrl: preference.sandbox_init_point,
      mode: mercadoPagoCheckoutMode,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/platform-payments/external-checkout', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const artist = await getArtistFromToken(req);
    const checkoutUrl = String(infinitePayCheckoutUrl || '').trim();
    const amountCents = await getPlatformMonthlyPriceCents(client);

    let parsedUrl;
    try {
      parsedUrl = new URL(checkoutUrl);
    } catch {
      const error = new Error('URL de checkout invalida.');
      error.status = 400;
      throw error;
    }

    if (parsedUrl.hostname !== 'checkout.infinitepay.io') {
      const error = new Error('URL de checkout externo nao permitida.');
      error.status = 400;
      throw error;
    }

    const { data: payment, error: paymentError } = await client
      .from('platform_payments')
      .insert({
        artist_id: artist.id,
        provider: 'infinitepay',
        external_reference: crypto.randomUUID(),
        provider_preference_id: 'infinitepay-static-link',
        status: 'pending',
        amount_cents: amountCents,
        currency: 'BRL',
        checkout_url: checkoutUrl,
        raw_payload: {
          provider: 'infinitepay',
          mode: 'static_link',
          billing_month: getBillingMonth(),
          checkout_url: checkoutUrl,
        },
      })
      .select('id, external_reference')
      .single();

    if (paymentError) throwPlatformPaymentsSetupError(paymentError);

    res.json({
      id: payment.id,
      externalReference: payment.external_reference,
      checkoutUrl,
      provider: 'infinitepay',
      status: 'pending',
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/platform-payments/infinitepay-checkout', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const artist = await getArtistFromToken(req);
    const amountCents = await getPlatformMonthlyPriceCents(client);
    const handle = String(infinitePayHandle || '').trim();

    if (!handle) {
      const error = new Error('INFINITEPAY_HANDLE nao configurado na API.');
      error.status = 500;
      throw error;
    }

    const externalReference = crypto.randomUUID();
    const { data: payment, error: paymentError } = await client
      .from('platform_payments')
      .insert({
        artist_id: artist.id,
        provider: 'infinitepay',
        external_reference: externalReference,
        provider_preference_id: 'infinitepay-checkout-api',
        status: 'pending',
        amount_cents: amountCents,
        currency: 'BRL',
        raw_payload: {
          provider: 'infinitepay',
          mode: 'checkout_api',
          billing_month: getBillingMonth(),
        },
      })
      .select('id, external_reference')
      .single();

    if (paymentError) throwPlatformPaymentsSetupError(paymentError);

    const appUrl = publicAppUrl.replace(/\/$/, '');
    const webhookUrl = infinitePayWebhookUrl;
    const checkout = await infinitePayFetch('/links', {
      handle,
      order_nsu: externalReference,
      redirect_url: `${appUrl}/?billing=success`,
      webhook_url: webhookUrl,
      items: [
        {
          quantity: 1,
          price: amountCents,
          description: 'Mensalidade TatuApp',
        },
      ],
      ...optionalObject(Boolean(artist.email), {
        customer: {
          name: artist.artistic_name || artist.slug,
          email: artist.email,
        },
      }),
    });

    const checkoutUrl = checkout.url || checkout.checkout_url || checkout.payment_url || checkout.link || '';
    const invoiceSlug = checkout.invoice_slug || checkout.slug || '';

    const { error: updateError } = await client
      .from('platform_payments')
      .update({
        provider_preference_id: invoiceSlug || 'infinitepay-checkout-api',
        checkout_url: checkoutUrl,
        raw_payload: {
          ...checkout,
          provider: 'infinitepay',
          mode: 'checkout_api',
          billing_month: getBillingMonth(),
          order_nsu: externalReference,
          webhook_url: webhookUrl,
        },
      })
      .eq('id', payment.id);

    if (updateError) throwPlatformPaymentsSetupError(updateError);

    res.json({
      id: payment.id,
      externalReference: payment.external_reference,
      preferenceId: invoiceSlug,
      checkoutUrl,
      provider: 'infinitepay',
      status: 'pending',
      mode: 'checkout_api',
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/platform-payments/subscription', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const artist = await getArtistFromToken(req);
    const subscriptionUrl = String(infinitePaySubscriptionUrl || '').trim();
    const amountCents = await getPlatformMonthlyPriceCents(client);

    let parsedUrl;
    try {
      parsedUrl = new URL(subscriptionUrl);
    } catch {
      const error = new Error('URL de assinatura invalida.');
      error.status = 400;
      throw error;
    }

    if (parsedUrl.hostname !== 'invoice.infinitepay.io' || !parsedUrl.pathname.startsWith('/plans/')) {
      const error = new Error('URL de assinatura InfinitePay nao permitida.');
      error.status = 400;
      throw error;
    }

    const externalReference = crypto.randomUUID();
    const { data: payment, error: paymentError } = await client
      .from('platform_payments')
      .insert({
        artist_id: artist.id,
        provider: 'infinitepay',
        external_reference: externalReference,
        provider_preference_id: 'infinitepay-subscription-plan',
        status: 'pending',
        amount_cents: amountCents,
        currency: 'BRL',
        checkout_url: subscriptionUrl,
        raw_payload: {
          provider: 'infinitepay',
          mode: 'subscription_plan',
          billing_month: getBillingMonth(),
          subscription_url: subscriptionUrl,
        },
      })
      .select('id, external_reference')
      .single();

    if (paymentError) throwPlatformPaymentsSetupError(paymentError);

    res.json({
      id: payment.id,
      externalReference: payment.external_reference,
      checkoutUrl: subscriptionUrl,
      provider: 'infinitepay',
      status: 'pending',
      mode: 'subscription_plan',
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/infinitepay/webhook', (_req, res) => {
  res.json({
    ok: true,
    method: 'POST',
    message: 'Webhook InfinitePay ativo. Configure esta URL no checkout da InfinitePay.',
  });
});

app.post('/api/infinitepay/webhook', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const body = req.body || {};
    const orderNsu = String(body.order_nsu || body.orderNSU || body.external_reference || '').trim();
    const transactionNsu = String(body.transaction_nsu || body.transactionNSU || body.transaction_id || '').trim();
    const invoiceSlug = String(body.invoice_slug || body.slug || '').trim();

    if (!orderNsu) {
      const error = new Error('Webhook InfinitePay sem order_nsu.');
      error.status = 400;
      throw error;
    }

    const { data: payment, error: paymentError } = await client
      .from('platform_payments')
      .select('id, artist_id, status, amount_cents, provider, provider_payment_id, provider_preference_id')
      .eq('external_reference', orderNsu)
      .maybeSingle();

    if (paymentError) throwPlatformPaymentsSetupError(paymentError);
    if (!payment) {
      res.status(200).json({ ok: true, ignored: true });
      return;
    }
    if (payment.provider !== 'infinitepay') {
      throw httpError('Referencia nao pertence a um pagamento InfinitePay.', 400);
    }
    if (payment.status === 'approved') {
      res.status(200).json({ ok: true, duplicate: true });
      return;
    }

    let check = null;
    if (infinitePayHandle && transactionNsu && invoiceSlug) {
      check = await infinitePayFetch('/payment_check', {
        handle: infinitePayHandle,
        order_nsu: orderNsu,
        transaction_nsu: transactionNsu,
        slug: invoiceSlug,
      });

      if (check.paid !== true) {
        const error = new Error('Pagamento InfinitePay ainda nao consta como pago.');
        error.status = 400;
        throw error;
      }
    } else {
      const error = new Error('Webhook InfinitePay sem dados suficientes para validar pagamento.');
      error.status = 400;
      throw error;
    }

    if (
      payment.provider_preference_id &&
      payment.provider_preference_id !== 'infinitepay-checkout-api' &&
      payment.provider_preference_id !== invoiceSlug
    ) {
      throw httpError('Referencia da cobranca InfinitePay nao confere.', 400);
    }
    if (payment.provider_payment_id && payment.provider_payment_id !== transactionNsu) {
      throw httpError('Transacao InfinitePay nao confere com o pagamento registrado.', 400);
    }

    const amountCents = Math.round(Number(check?.amount || body.amount || body.paid_amount || 0));
    if (!Number.isFinite(amountCents) || amountCents < payment.amount_cents) {
      throw httpError('Valor pago na InfinitePay e menor que o valor esperado.', 400);
    }
    const receiptUrl = String(body.receipt_url || body.receiptUrl || '');
    const paymentPayload = {
      provider: 'infinitepay',
      mode: 'checkout_api_webhook',
      billing_month: getBillingMonth(),
      receipt_url: receiptUrl,
      webhook: body,
      payment_check: check,
    };
    const { data: approval, error: approvalError } = await client.rpc('approve_infinitepay_payment_once', {
      p_payment_id: payment.id,
      p_provider_payment_id: transactionNsu,
      p_invoice_slug: invoiceSlug,
      p_amount_cents: amountCents,
      p_payload: paymentPayload,
      p_checkout_url: receiptUrl,
    });
    if (approvalError) {
      if (/approve_infinitepay_payment_once|schema cache|does not exist/i.test(approvalError.message || '')) {
        throw httpError(
          'Ative database/booking-payment-security-fixes.sql antes de processar pagamentos InfinitePay.',
          503
        );
      }
      throwPlatformPaymentsSetupError(approvalError);
    }

    res.status(200).json({ ok: true, approved: Boolean(approval?.[0]?.approved) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/mercado-pago/webhook', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const paymentId =
      req.body?.data?.id ||
      req.query?.['data.id'] ||
      req.query?.id ||
      req.body?.id ||
      '';

    if (!paymentId) {
      res.status(200).json({ ok: true, ignored: true });
      return;
    }

    if (!validateMercadoPagoSignature(req, paymentId)) {
      const error = new Error('Assinatura do Mercado Pago invalida.');
      error.status = 401;
      throw error;
    }

    const mercadoPayment = await mercadoPagoFetch(`/v1/payments/${paymentId}`);
    const externalReference = mercadoPayment.external_reference || '';
    const status = normalizeMercadoPagoStatus(mercadoPayment.status);

    if (!externalReference) {
      res.status(200).json({ ok: true, ignored: true });
      return;
    }

    const { data: existingPayment, error: existingError } = await client
      .from('platform_payments')
      .select('id, artist_id, status')
      .eq('external_reference', externalReference)
      .maybeSingle();

    if (existingError) throwPlatformPaymentsSetupError(existingError);
    if (!existingPayment) {
      res.status(200).json({ ok: true, ignored: true });
      return;
    }

    const { error: updateError } = await client
      .from('platform_payments')
      .update({
        provider_payment_id: String(mercadoPayment.id || paymentId),
        status,
        amount_cents: Math.round(Number(mercadoPayment.transaction_amount || 0) * 100),
        currency: mercadoPayment.currency_id || 'BRL',
        raw_payload: mercadoPayment,
        paid_at: status === 'approved'
          ? mercadoPayment.date_approved || new Date().toISOString()
          : null,
      })
      .eq('id', existingPayment.id);

    if (updateError) throwPlatformPaymentsSetupError(updateError);

    if (status === 'approved' && existingPayment.status !== 'approved') {
      await grantPaidAccess(client, existingPayment.artist_id, String(mercadoPayment.id || paymentId));
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/uploads/profile/:kind', upload.single('file'), async (req, res, next) => {
  try {
    const kind = req.params.kind;
    if (!['avatar', 'cover'].includes(kind)) {
      const error = new Error('Tipo de imagem invalido.');
      error.status = 400;
      throw error;
    }

    assertImage(req.file);
    const artist = await getArtistFromToken(req);
    await assertArtistHasActiveAccess(requireSupabase(), artist.id);
    const width = kind === 'avatar' ? 800 : 1800;
    const saved = await saveWebp(req.file, `artists/${artist.id}/${kind}`, width);
    const column = kind === 'avatar' ? 'avatar_path' : 'cover_path';
    const sourceColumn = kind === 'avatar' ? 'avatar_source' : 'cover_source';

    const { error } = await requireSupabase()
      .from('artist_profiles')
      .update({
        [column]: saved.filePath,
        [sourceColumn]: 'upload',
      })
      .eq('id', artist.id);

    if (error) throw error;

    res.json({
      url: publicUrl(saved.filePath),
      filePath: saved.filePath,
      internalName: saved.internalName,
      mimeType: saved.mimeType,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/uploads/portfolio', upload.single('file'), async (req, res, next) => {
  try {
    assertImage(req.file);
    const artist = await getArtistFromToken(req);
    const client = requireSupabase();
    await assertArtistHasActiveAccess(client, artist.id);

    const { count, error: countError } = await client
      .from('portfolio_photos')
      .select('id', { count: 'exact', head: true })
      .eq('artist_id', artist.id);

    if (countError) throw countError;
    if ((count || 0) >= 10) {
      const error = new Error('Limite de 10 fotos no portfolio atingido.');
      error.status = 400;
      throw error;
    }

    const saved = await saveWebp(req.file, `artists/${artist.id}/portfolio`, 1400);
    const { data, error } = await client
      .from('portfolio_photos')
      .insert({
        artist_id: artist.id,
        file_path: saved.filePath,
        file_source: 'upload',
        alt: '',
        caption: '',
        sort_order: count || 0,
      })
      .select('id, file_path, alt, caption')
      .single();

    if (error) throw error;

    res.json({
      id: data.id,
      url: publicUrl(data.file_path),
      filePath: data.file_path,
      alt: data.alt,
      caption: data.caption || '',
      internalName: saved.internalName,
      mimeType: saved.mimeType,
    });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/uploads/portfolio/:photoId', async (req, res, next) => {
  try {
    const artist = await getArtistFromToken(req);
    const client = requireSupabase();
    await assertArtistHasActiveAccess(client, artist.id);
    const photoId = assertUuid(req.params.photoId, 'Foto');
    const { error } = await client
      .from('portfolio_photos')
      .delete()
      .eq('artist_id', artist.id)
      .eq('id', photoId);

    if (error) throw error;

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/uploads/appointments/:appointmentId/proof', proofUploadLimiter, upload.single('file'), async (req, res, next) => {
  try {
    assertProof(req.file);
    const client = requireSupabase();
    const appointmentId = assertUuid(req.params.appointmentId, 'Reserva');
    const artistId = assertUuid(req.body.artistId, 'Artista');
    const uploadToken = requiredText(req.body.uploadToken, 'Token de upload', 32, 200);

    const { data: appointment, error: appointmentError } = await client
      .from('appointments')
      .select('id, artist_id, deposit_required, payment_status, proof_upload_token_hash, proof_upload_token_expires_at')
      .eq('id', appointmentId)
      .eq('artist_id', artistId)
      .single();

    if (appointmentError || !appointment) {
      const error = new Error('Reserva nao encontrada.');
      error.status = 404;
      throw error;
    }
    await assertPublicArtistAvailable(client, artistId);
    if (!appointment.deposit_required || !['pending_proof', 'proof_rejected'].includes(appointment.payment_status)) {
      throw httpError('Esta reserva nao aceita novo comprovante.', 400);
    }
    if (
      !secretsEqual(hashSecret(uploadToken), appointment.proof_upload_token_hash || '') ||
      !appointment.proof_upload_token_expires_at ||
      new Date(appointment.proof_upload_token_expires_at).getTime() <= Date.now()
    ) {
      throw httpError('Token de envio invalido ou expirado.', 403);
    }

    const saved = await saveProof(req.file, `artists/${artistId}/appointments/${appointmentId}`);
    const originalName = safeOriginalName(req.file.originalname);
    const { data: fileId, error } = await client.rpc('record_appointment_proof_upload', {
      p_appointment_id: appointmentId,
      p_artist_id: artistId,
      p_token_hash: hashSecret(uploadToken),
      p_original_name: originalName,
      p_internal_name: saved.internalName,
      p_file_path: saved.filePath,
      p_mime_type: saved.mimeType,
      p_file_size: req.file.size,
    });
    if (error) {
      await fs.unlink(privateDiskPath(saved.filePath)).catch(() => {});
      if (/record_appointment_proof_upload|schema cache|does not exist/i.test(error.message || '')) {
        throw httpError(
          'Ative database/booking-payment-security-fixes.sql antes de enviar comprovantes.',
          503
        );
      }
      throw error;
    }

    res.json({
      id: fileId,
      url: privateProofUrl(fileId),
      filePath: saved.filePath,
      originalName,
      internalName: saved.internalName,
      mimeType: saved.mimeType,
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/appointment-files/:fileId/open', async (req, res, next) => {
  try {
    const artist = await getArtistFromToken(req);
    const fileId = assertUuid(req.params.fileId, 'Arquivo');
    const { data: file, error } = await requireSupabase()
      .from('appointment_files')
      .select('file_path, original_name, mime_type')
      .eq('id', fileId)
      .eq('artist_id', artist.id)
      .single();

    if (error || !file) {
      const notFound = new Error('Arquivo nao encontrado.');
      notFound.status = 404;
      throw notFound;
    }

    const diskPath = privateDiskPath(file.file_path);
    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${safeOriginalName(file.original_name || 'comprovante')}"`
    );
    res.sendFile(diskPath);
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  const isMulterSizeError = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE';
  const isBrokenMultipart = /unexpected end of form/i.test(error.message || '');
  const status = isMulterSizeError || isBrokenMultipart ? 413 : error.status || 500;
  const message = isMulterSizeError || isBrokenMultipart
    ? 'Arquivo muito grande ou upload interrompido. Tente uma imagem menor.'
    : error.message || 'Erro inesperado.';

  console.error('[api-error]', {
    status,
    message,
    details: error.details || null,
  });
  res.status(status).json({
    error: message,
    details: status < 500 ? error.details || null : null,
  });
});

const server = app.listen(port, () => {
  console.log(`Upload API em http://localhost:${port}`);
  console.log(`Uploads em ${uploadsRoot}`);
  console.log(`Uploads privados em ${privateUploadsRoot}`);
});

server.on('error', (error) => {
  console.error('Erro ao iniciar Upload API:', error.message);
  process.exit(1);
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
