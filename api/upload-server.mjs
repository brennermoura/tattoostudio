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
const corsOrigins = process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean) || [];

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

app.use(
  cors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
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
  return name.normalize('NFKD').replace(/[^\w.\-]+/g, '-').slice(0, 120) || 'arquivo';
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
  const cleanToken = String(visitorToken || 'anon').trim() || 'anon';
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
  const visitorToken = options.visitorToken || '';

  const appointmentsQuery = includePrivateAppointments
    ? client
        .from('appointments')
        .select(
          'id, client_name, client_phone, client_email, appointment_date, appointment_time, description, status, deposit_required, deposit_paid, deposit_credit_used, created_at'
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
    userId: profile.user_id,
    slug: profile.slug,
    artisticName: profile.artistic_name,
    realName: profile.real_name,
    avatar: resolvePublicAsset(profile.avatar_path),
    coverImage: resolvePublicAsset(profile.cover_path),
    bio: profile.bio,
    instagram: profile.instagram,
    whatsapp: profile.whatsapp,
    addressStreet: profile.address_street || '',
    addressNumber: profile.address_number || '',
    addressComplement: profile.address_complement || '',
    neighborhood: profile.neighborhood || '',
    postalCode: profile.postal_code || '',
    publicNeighborhood: profile.public_neighborhood || '',
    publicAddressLabel: profile.public_address_label || '',
    city: profile.city,
    state: profile.state,
    latitude: profile.latitude,
    longitude: profile.longitude,
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
  const response = await fetch(`https://api.checkout.infinitepay.io${pathname}`, {
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

async function grantInfinitePayAccess(client, artistId, reference) {
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
    grant_type: 'paid_infinitepay',
    starts_at: now.toISOString(),
    ends_at: endsAt.toISOString(),
    lifetime: false,
    note: `InfinitePay confirmado - ${reference}`,
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
    const { error } = await client
      .from('artist_profiles')
      .update({ plan_status: req.body?.blocked ? 'blocked' : 'active' })
      .eq('id', req.params.artistId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/artists/:artistId/grants', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const user = await requirePlatformAdmin(req);
    const lifetime = Boolean(req.body?.lifetime);
    const grantType = lifetime ? 'lifetime' : req.body?.grantType || 'manual_free';
    const endsAt = lifetime ? null : req.body?.endsAt || null;

    if (!lifetime && !endsAt) {
      const error = new Error('Informe uma data final ou marque acesso vitalicio.');
      error.status = 400;
      throw error;
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
        artist_id: req.params.artistId,
        grant_type: grantType,
        ends_at: endsAt,
        lifetime,
        note: req.body?.note || '',
        created_by: user.id,
      })
      .select('id')
      .single();
    if (error) throw error;

    await client.from('artist_profiles').update({ plan_status: 'active' }).eq('id', req.params.artistId);
    res.json({ id: data.id });
  } catch (error) {
    next(error);
  }
});

app.put('/api/admin/platform-settings/monthly-price', async (req, res, next) => {
  try {
    const client = requireSupabase();
    await requirePlatformAdmin(req);
    const monthlyPriceCents = Math.max(100, Number(req.body?.monthlyPriceCents || 0));
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
    const { data: profile, error: profileError } = await client
      .from('artist_profiles')
      .select('id, user_id')
      .eq('id', req.params.artistId)
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

    const activeGrant = await getArtistActiveGrant(client, req.params.artistId);
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
    if (artist.id !== req.params.artistId) {
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
    if (artist.id !== req.params.artistId) {
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
    await assertPublicArtistAvailable(client, req.params.artistId);
    const visitorToken = String(req.query.visitorToken || 'anon').trim() || 'anon';
    const { count, error: countError } = await client
      .from('artist_likes')
      .select('id', { count: 'exact', head: true })
      .eq('artist_id', req.params.artistId);
    if (countError) throw countError;
    const { data: liked } = await client
      .from('artist_likes')
      .select('id')
      .eq('artist_id', req.params.artistId)
      .eq('visitor_token', visitorToken)
      .maybeSingle();
    res.json({ like_count: count || 0, viewer_liked: Boolean(liked) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/public/artists/:artistId/likes/toggle', async (req, res, next) => {
  try {
    const client = requireSupabase();
    await assertPublicArtistAvailable(client, req.params.artistId);
    const visitorToken = String(req.body?.visitorToken || 'anon').trim().slice(0, 120) || 'anon';
    const { data: liked } = await client
      .from('artist_likes')
      .select('id')
      .eq('artist_id', req.params.artistId)
      .eq('visitor_token', visitorToken)
      .maybeSingle();

    if (liked) {
      const { error } = await client
        .from('artist_likes')
        .delete()
        .eq('artist_id', req.params.artistId)
        .eq('visitor_token', visitorToken);
      if (error) throw error;
    } else {
      const { error } = await client
        .from('artist_likes')
        .insert({ artist_id: req.params.artistId, visitor_token: visitorToken });
      if (error) throw error;
    }

    const { count } = await client
      .from('artist_likes')
      .select('id', { count: 'exact', head: true })
      .eq('artist_id', req.params.artistId);
    res.json({ like_count: count || 0, viewer_liked: !liked });
  } catch (error) {
    next(error);
  }
});

app.get('/api/public/profiles/:slug/approved-slots', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const { data: profile, error: profileError } = await client
      .from('artist_profiles')
      .select('id, plan_status')
      .eq('slug', req.params.slug)
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

app.post('/api/public/appointments', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const artistId = req.body?.artistId;
    await assertPublicArtistAvailable(client, artistId);

    const appointmentDate = req.body?.date;
    const appointmentTime = req.body?.time;
    if (!appointmentDate || !appointmentTime || new Date(`${appointmentDate}T00:00:00`) < new Date(new Date().toDateString())) {
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
    const depositCreditUsed = Boolean(req.body?.depositCreditUsed);
    const paymentStatus = !depositRequired
      ? 'not_required'
      : depositCreditUsed
      ? 'credited'
      : 'pending_proof';

    const { data, error } = await client
      .from('appointments')
      .insert({
        artist_id: artistId,
        client_name: String(req.body?.clientName || '').trim(),
        client_phone: String(req.body?.clientPhone || '').trim(),
        client_email: String(req.body?.clientEmail || '').trim(),
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        description: String(req.body?.description || '').trim(),
        status: 'pending',
        deposit_required: depositRequired,
        deposit_value: depositValue,
        deposit_paid: false,
        deposit_credit_used: depositRequired ? depositCreditUsed : false,
        payment_status: paymentStatus,
      })
      .select('id, created_at')
      .single();
    if (error) throw error;

    res.json(data);
  } catch (error) {
    next(error);
  }
});

app.get('/api/public/artists', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const visitorToken = String(req.query.visitorToken || '');
    const { data: profiles, error } = await client
      .from('artist_profiles')
      .select(
        'id, user_id, slug, artistic_name, real_name, avatar_path, cover_path, bio, instagram, whatsapp, address_street, address_number, address_complement, neighborhood, postal_code, public_neighborhood, public_address_label, city, state, latitude, longitude, styles, accent_color, plan_status, created_at'
      )
      .eq('plan_status', 'active')
      .order('created_at', { ascending: false })
      .limit(80);
    if (error) throw error;

    const artists = await Promise.all(
      (profiles || []).map(async (profile) => {
        if (!(await artistHasActiveAccess(client, profile.id))) return null;
        const likeStatus = await getLikeStatus(client, profile.id, visitorToken);
        return {
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
          latitude: profile.latitude,
          longitude: profile.longitude,
          styles: profile.styles || [],
          accentColor: profile.accent_color,
          createdAt: profile.created_at,
          likeCount: likeStatus.likeCount,
          featuredImage: '',
        };
      })
    );

    res.json({ artists: artists.filter(Boolean) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/public/profiles/:slug', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const { data: profile, error } = await client
      .from('artist_profiles')
      .select(
        'id, user_id, slug, artistic_name, real_name, avatar_path, cover_path, bio, instagram, whatsapp, address_street, address_number, address_complement, neighborhood, postal_code, public_neighborhood, public_address_label, city, state, latitude, longitude, styles, accent_color, plan_status'
      )
      .eq('slug', req.params.slug)
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

    res.json({ artist: await buildArtistPayload(client, profile, { includePrivateAppointments: true }) });
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
      res.json({ artist: await buildArtistPayload(client, existing, { includePrivateAppointments: true }) });
      return;
    }

    const body = req.body || {};
    const cleanName = String(body.artisticName || user.email?.split('@')[0] || 'Artista').trim();
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
        whatsapp: body.whatsapp || '',
        address_street: body.addressStreet || '',
        address_number: body.addressNumber || '',
        address_complement: body.addressComplement || '',
        neighborhood: body.neighborhood || '',
        postal_code: body.postalCode || '',
        public_neighborhood: body.publicNeighborhood || body.neighborhood || '',
        public_address_label:
          body.publicAddressLabel || [body.neighborhood, body.city].filter(Boolean).join(', '),
        city: body.city || '',
        state: body.state || '',
        latitude: body.latitude || null,
        longitude: body.longitude || null,
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

    res.json({ artist: await buildArtistPayload(client, profile, { includePrivateAppointments: true }) });
  } catch (error) {
    next(error);
  }
});

app.put('/api/me/artist/:artistId', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const artist = await getArtistFromToken(req);
    if (artist.id !== req.params.artistId) {
      const error = new Error('Acesso negado.');
      error.status = 403;
      throw error;
    }

    const body = req.body || {};
    const profileUpdate = {
      slug: body.slug,
      artistic_name: body.artisticName,
      real_name: body.realName || body.artisticName,
      bio: body.bio || '',
      instagram: body.instagram || '',
      whatsapp: body.whatsapp || '',
      address_street: body.addressStreet || '',
      address_number: body.addressNumber || '',
      address_complement: body.addressComplement || '',
      neighborhood: body.neighborhood || '',
      postal_code: body.postalCode || '',
      public_neighborhood: body.publicNeighborhood || body.neighborhood || '',
      public_address_label:
        body.publicAddressLabel ||
        [body.publicNeighborhood || body.neighborhood, body.city].filter(Boolean).join(', '),
      city: body.city || '',
      state: body.state || '',
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      styles: body.styles || [],
      accent_color: body.accentColor || '#a855f7',
    };

    if (!body.avatar || String(body.avatar).startsWith('/uploads/') || /^https?:/i.test(String(body.avatar))) {
      profileUpdate.avatar_path = body.avatar || '';
      profileUpdate.avatar_source = body.avatar ? (String(body.avatar).startsWith('/uploads/') ? 'upload' : 'external_url') : 'upload';
    }
    if (!body.coverImage || String(body.coverImage).startsWith('/uploads/') || /^https?:/i.test(String(body.coverImage))) {
      profileUpdate.cover_path = body.coverImage || '';
      profileUpdate.cover_source = body.coverImage ? (String(body.coverImage).startsWith('/uploads/') ? 'upload' : 'external_url') : 'upload';
    }

    const { error: profileError } = await client.from('artist_profiles').update(profileUpdate).eq('id', artist.id);
    if (profileError) throw profileError;

    const { error: pixError } = await client.from('artist_pix_settings').upsert({
      artist_id: artist.id,
      pix_key: body.pixKey || '',
      pix_type: body.pixType || 'phone',
      deposit_value: body.depositValue || 0,
      deposit_required: body.depositRequired !== false,
    });
    if (pixError) throw pixError;

    const weeklySlotRows = Object.entries(body.customSlots || {}).flatMap(([weekday, slots]) =>
      (slots || []).map((slot) => ({ artist_id: artist.id, weekday: Number(weekday), slot_time: slot }))
    );
    const dateSlotRows = Object.entries(body.dateSlots || {}).flatMap(([slotDate, slots]) =>
      (slots || []).map((slot) => ({ artist_id: artist.id, slot_date: slotDate, slot_time: slot }))
    );
    const blockedDateRows = (body.blockedDates || []).map((blockedDate) => ({
      artist_id: artist.id,
      blocked_date: blockedDate,
    }));

    await client.from('weekly_slots').delete().eq('artist_id', artist.id);
    if (weeklySlotRows.length > 0) {
      const { error } = await client.from('weekly_slots').insert(weeklySlotRows);
      if (error) throw error;
    }

    await client.from('appointment_slots').delete().eq('artist_id', artist.id);
    if (dateSlotRows.length > 0) {
      const { error } = await client.from('appointment_slots').insert(dateSlotRows);
      if (error) throw error;
    }

    await client.from('blocked_dates').delete().eq('artist_id', artist.id);
    if (blockedDateRows.length > 0) {
      const { error } = await client.from('blocked_dates').insert(blockedDateRows);
      if (error) throw error;
    }

    for (const [index, photo] of (body.portfolio || []).entries()) {
      if (!photo.id || String(photo.id).startsWith('p')) continue;
      const { error } = await client
        .from('portfolio_photos')
        .update({
          caption: photo.caption || '',
          alt: photo.alt || photo.caption || '',
          sort_order: index,
        })
        .eq('artist_id', artist.id)
        .eq('id', photo.id);
      if (error) throw error;
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
    const status = req.body?.status;
    const paymentStatus = status === 'approved' ? 'checked' : status === 'rejected' ? 'credited' : undefined;
    const { error } = await client
      .from('appointments')
      .update({ status, ...(paymentStatus ? { payment_status: paymentStatus } : {}) })
      .eq('id', req.params.appointmentId)
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
    const { error } = await client
      .from('appointments')
      .update({ appointment_date: req.body?.date, appointment_time: req.body?.time })
      .eq('id', req.params.appointmentId)
      .eq('artist_id', artist.id);
    if (error) throw error;
    res.json({ ok: true });
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
    const checkoutUrl = String(req.body?.checkoutUrl || infinitePayCheckoutUrl).trim();
    const amountCents = Number(req.body?.amountCents || 0);

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
        amount_cents: Number.isFinite(amountCents) && amountCents > 0 ? Math.round(amountCents) : 0,
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
    const handle = String(req.body?.handle || infinitePayHandle || '').trim();

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
    const subscriptionUrl = String(req.body?.subscriptionUrl || infinitePaySubscriptionUrl).trim();
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
      .select('id, artist_id, status, amount_cents')
      .eq('external_reference', orderNsu)
      .maybeSingle();

    if (paymentError) throwPlatformPaymentsSetupError(paymentError);
    if (!payment) {
      res.status(200).json({ ok: true, ignored: true });
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

    const amountCents = Math.round(Number(check?.amount || body.amount || body.paid_amount || payment.amount_cents || 0));
    const receiptUrl = String(body.receipt_url || body.receiptUrl || '');
    const paymentUpdate = {
      provider: 'infinitepay',
      provider_payment_id: transactionNsu,
      provider_preference_id: invoiceSlug || 'infinitepay-checkout-api',
      status: 'approved',
      amount_cents: amountCents,
      currency: 'BRL',
      raw_payload: {
        ...body,
        payment_check: check,
        provider: 'infinitepay',
        mode: 'checkout_api_webhook',
        billing_month: getBillingMonth(),
      },
      paid_at: new Date().toISOString(),
    };

    if (receiptUrl) {
      paymentUpdate.checkout_url = receiptUrl;
    }

    const { error: updateError } = await client
      .from('platform_payments')
      .update(paymentUpdate)
      .eq('id', payment.id);

    if (updateError) throwPlatformPaymentsSetupError(updateError);

    if (payment.status !== 'approved') {
      await grantInfinitePayAccess(client, payment.artist_id, transactionNsu || orderNsu);
    }

    res.status(200).json({ ok: true });
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
    const { error } = await requireSupabase()
      .from('portfolio_photos')
      .delete()
      .eq('artist_id', artist.id)
      .eq('id', req.params.photoId);

    if (error) throw error;

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/uploads/appointments/:appointmentId/proof', upload.single('file'), async (req, res, next) => {
  try {
    assertProof(req.file);
    const client = requireSupabase();
    const appointmentId = req.params.appointmentId;
    const artistId = String(req.body.artistId || '');

    if (!artistId) {
      const error = new Error('artistId ausente.');
      error.status = 400;
      throw error;
    }

    const { data: appointment, error: appointmentError } = await client
      .from('appointments')
      .select('id, artist_id')
      .eq('id', appointmentId)
      .eq('artist_id', artistId)
      .single();

    if (appointmentError || !appointment) {
      const error = new Error('Reserva nao encontrada.');
      error.status = 404;
      throw error;
    }

    const saved = await saveProof(req.file, `artists/${artistId}/appointments/${appointmentId}`);
    const { data, error } = await client
      .from('appointment_files')
      .insert({
        appointment_id: appointmentId,
        artist_id: artistId,
        file_type: 'pix_proof',
        original_name: safeOriginalName(req.file.originalname),
        internal_name: saved.internalName,
        file_path: saved.filePath,
        mime_type: saved.mimeType,
        file_size: req.file.size,
      })
      .select('id, file_path, original_name')
      .single();

    if (error) throw error;

    await client
      .from('appointments')
      .update({ payment_status: 'proof_sent', deposit_paid: true })
      .eq('id', appointmentId)
      .eq('artist_id', artistId);

    res.json({
      id: data.id,
      url: privateProofUrl(data.id),
      filePath: data.file_path,
      originalName: data.original_name,
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
    const { data: file, error } = await requireSupabase()
      .from('appointment_files')
      .select('file_path, original_name, mime_type')
      .eq('id', req.params.fileId)
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
