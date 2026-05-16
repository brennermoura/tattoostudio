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
const mercadoPagoWebhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET || '';
const mercadoPagoCheckoutMode = process.env.MERCADO_PAGO_CHECKOUT_MODE === 'sandbox' ? 'sandbox' : 'production';
const platformMonthlyPrice = Number(process.env.PLATFORM_MONTHLY_PRICE || process.env.VITE_PLATFORM_MONTHLY_PRICE || 49);
const publicAppUrl = (process.env.PUBLIC_APP_URL || process.env.CORS_ORIGIN || 'http://localhost:5173').split(',')[0];
const publicApiBaseUrl = process.env.PUBLIC_API_BASE_URL || process.env.VITE_UPLOAD_API_URL || `http://localhost:${port}`;
const publicBaseUrl = (process.env.PUBLIC_UPLOAD_BASE_URL || publicApiBaseUrl).replace(/\/+$/, '');
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

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
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

function assertMercadoPagoConfigured() {
  if (!mercadoPagoAccessToken) {
    const error = new Error('MERCADO_PAGO_ACCESS_TOKEN nao configurado na API.');
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
    'Banco de pagamentos ainda nao aplicado. Rode database/mercado-pago-payments.sql no Supabase antes de testar Mercado Pago.'
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
      Authorization: `Bearer ${mercadoPagoAccessToken}`,
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

app.post('/api/platform-payments/checkout', async (req, res, next) => {
  try {
    const client = requireSupabase();
    const artist = await getArtistFromToken(req);
    const amountCents = Math.round(platformMonthlyPrice * 100);

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
            unit_price: platformMonthlyPrice,
            currency_id: 'BRL',
          },
        ],
        payer: {
          email: artist.email || undefined,
        },
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
        alt: safeOriginalName(req.file.originalname),
        sort_order: count || 0,
      })
      .select('id, file_path, alt')
      .single();

    if (error) throw error;

    res.json({
      id: data.id,
      url: publicUrl(data.file_path),
      filePath: data.file_path,
      alt: data.alt,
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
  const status = error.status || 500;
  res.status(status).json({
    error: error.message || 'Erro inesperado.',
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
