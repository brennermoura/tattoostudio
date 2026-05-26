import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { rm } from 'node:fs/promises';
import http from 'node:http';
import { test } from 'node:test';

const apiPort = 18982;
const dependencyPort = 18992;
const artistId = '11111111-1111-4111-8111-111111111111';
const appointmentId = '22222222-2222-4222-8222-222222222222';
const paymentId = '33333333-3333-4333-8333-333333333333';
const userId = '44444444-4444-4444-8444-444444444444';
const uploadsDir = '/tmp/tatuapp-security-api-tests';

function respond(res, body, status = 200, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
}

async function bodyFrom(req) {
  let body = '';
  for await (const chunk of req) body += chunk;
  if (!body || !req.headers['content-type']?.includes('application/json')) return {};
  return JSON.parse(body);
}

function maybeObject(req, value) {
  return req.headers.accept?.includes('vnd.pgrst.object') ? value : value ? [value] : [];
}

function dependencyServer(state) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://127.0.0.1:${dependencyPort}`);
    const body = await bodyFrom(req);

    if (url.pathname === '/auth/v1/user') {
      respond(res, { id: userId, email: 'artist@example.test' });
      return;
    }

    if (url.pathname === '/links') {
      state.checkoutRequest = body;
      respond(res, { url: 'https://checkout.infinitepay.io/env-handle/order', invoice_slug: 'invoice-test' });
      return;
    }

    if (url.pathname === '/payment_check') {
      state.paymentCheckRequest = body;
      respond(res, { paid: true, amount: state.paymentCheckAmount });
      return;
    }

    if (url.pathname === '/postal/25240000/json/') {
      respond(res, {
        cep: '25240-000',
        logradouro: 'Rua Teste',
        bairro: 'Centro',
        localidade: 'Duque de Caxias',
        uf: 'RJ',
      });
      return;
    }

    if (url.pathname === '/geocoder/search') {
      respond(res, [{ lat: '-22.7863', lon: '-43.3071' }]);
      return;
    }

    if (url.pathname === '/geocoder/reverse') {
      respond(res, {
        address: {
          road: 'Rua Teste',
          suburb: 'Centro',
          city: 'Duque de Caxias',
          state: 'Rio de Janeiro',
          postcode: '25240-000',
          'ISO3166-2-lvl4': 'BR-RJ',
        },
      });
      return;
    }

    if (url.pathname === '/rest/v1/rpc/list_public_artists_for_api') {
      respond(res, [{
        id: artistId,
        slug: 'seguro-tattoo',
        artistic_name: 'Seguro Tattoo',
        avatar_path: '',
        cover_path: '',
        bio: '',
        instagram: '',
        public_neighborhood: 'Centro',
        public_address_label: 'Proximo ao metro',
        city: 'Rio de Janeiro',
        state: 'RJ',
        latitude: -22.987654,
        longitude: -43.123456,
        styles: [],
        accent_color: '#a855f7',
        created_at: '2026-05-25T00:00:00Z',
        like_count: 0,
      }]);
      return;
    }

    if (url.pathname === '/rest/v1/rpc/record_appointment_proof_upload') {
      state.proofRpcBody = body;
      respond(res, '55555555-5555-4555-8555-555555555555');
      return;
    }

    if (url.pathname === '/rest/v1/rpc/approve_infinitepay_payment_once') {
      state.paymentApprovalCalls += 1;
      state.payment.status = 'approved';
      respond(res, [{ approved: true, artist_id: artistId, grant_id: '66666666-6666-4666-8666-666666666666' }]);
      return;
    }

    if (url.pathname === '/rest/v1/rpc/save_artist_settings_transactional') {
      state.settingsRpcCalls += 1;
      respond(res, null, 204);
      return;
    }

    if (!url.pathname.startsWith('/rest/v1/')) {
      respond(res, { message: `Unhandled route ${url.pathname}` }, 404);
      return;
    }

    const table = url.pathname.replace('/rest/v1/', '');
    if (table === 'artist_profiles') {
      const profile = url.searchParams.has('user_id')
        ? { id: artistId, user_id: userId }
        : { id: artistId, plan_status: 'active' };
      respond(res, maybeObject(req, profile));
      return;
    }
    if (table === 'artist_access_grants') {
      const grant = state.activeAccess
        ? [{ ends_at: '2099-01-01T00:00:00Z', lifetime: false, grant_type: 'trial', note: '', created_at: '2026-01-01T00:00:00Z' }]
        : [];
      respond(res, grant);
      return;
    }
    if (table === 'blocked_dates' || table === 'appointment_slots') {
      respond(res, maybeObject(req, null));
      return;
    }
    if (table === 'weekly_slots') {
      respond(res, maybeObject(req, { id: 'available-slot' }));
      return;
    }
    if (table === 'artist_pix_settings') {
      respond(res, maybeObject(req, { deposit_required: state.depositRequired, deposit_value: 150 }));
      return;
    }
    if (table === 'platform_admins') {
      respond(res, maybeObject(req, { user_id: userId }));
      return;
    }
    if (table === 'appointments') {
      if (req.method === 'POST') {
        state.createdAppointments.push(body);
        respond(res, {
          id: appointmentId,
          created_at: '2026-05-25T00:00:00Z',
        }, 201);
        return;
      }
      if (req.method === 'PATCH') {
        state.reviewBodies.push(body);
        respond(res, maybeObject(req, { id: appointmentId }));
        return;
      }
      if ((url.searchParams.get('select') || '').includes('proof_upload_token_hash')) {
        respond(res, maybeObject(req, state.proofAppointment));
        return;
      }
      respond(res, maybeObject(req, null));
      return;
    }
    if (table === 'artist_notifications') {
      respond(res, [], 201);
      return;
    }
    if (table === 'platform_settings') {
      respond(res, maybeObject(req, { monthly_price_cents: 4900 }));
      return;
    }
    if (table === 'platform_payments') {
      if (req.method === 'POST') {
        state.payment = { ...body, id: paymentId, external_reference: body.external_reference, status: 'pending' };
        respond(res, { id: paymentId, external_reference: body.external_reference }, 201);
        return;
      }
      if (req.method === 'PATCH') {
        state.payment = { ...state.payment, ...body };
        respond(res, []);
        return;
      }
      respond(res, maybeObject(req, state.payment));
      return;
    }
    if (table === 'geocode_cache') {
      if (req.method === 'POST') {
        respond(res, null, 201);
        return;
      }
      respond(res, maybeObject(req, null));
      return;
    }

    respond(res, { message: `Unhandled table ${table}` }, 500);
  });
}

function startApi() {
  return spawn(process.execPath, ['api/upload-server.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      API_PORT: String(apiPort),
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://app.example.test',
      SUPABASE_URL: `http://127.0.0.1:${dependencyPort}`,
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role',
      PRIVATE_UPLOADS_DIR: uploadsDir,
      UPLOADS_DIR: `${uploadsDir}/public`,
      INFINITEPAY_HANDLE: 'env-handle',
      INFINITEPAY_API_BASE_URL: `http://127.0.0.1:${dependencyPort}`,
      INFINITEPAY_WEBHOOK_URL: 'https://api.example.test/api/infinitepay/webhook',
      PUBLIC_APP_URL: 'https://app.example.test',
      POSTAL_CODE_API_BASE_URL: `http://127.0.0.1:${dependencyPort}/postal`,
      GEOCODER_API_BASE_URL: `http://127.0.0.1:${dependencyPort}/geocoder`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function waitForApi(child) {
  let output = '';
  child.stdout.setEncoding('utf8');
  for await (const chunk of child.stdout) {
    output += chunk;
    if (output.includes('Upload API em')) return;
  }
  throw new Error(`API encerrou antes de iniciar: ${output}`);
}

async function close(child, server) {
  if (child.exitCode === null) {
    child.kill('SIGTERM');
    await once(child, 'exit');
  }
  await new Promise((resolve) => server.close(resolve));
  await rm(uploadsDir, { recursive: true, force: true });
}

function api(path, options) {
  return fetch(`http://127.0.0.1:${apiPort}${path}`, options);
}

function proofForm(token) {
  const form = new FormData();
  form.append('artistId', artistId);
  if (token) form.append('uploadToken', token);
  form.append('file', new Blob(['%PDF test proof'], { type: 'application/pdf' }), 'comprovante.pdf');
  return form;
}

test('critical booking, proof, payment and privacy rules are enforced by the API', async (t) => {
  const token = 'secure-proof-token-that-is-long-enough-for-validation';
  const state = {
    activeAccess: true,
    depositRequired: true,
    createdAppointments: [],
    proofAppointment: {
      id: appointmentId,
      artist_id: artistId,
      deposit_required: true,
      payment_status: 'pending_proof',
      proof_upload_token_hash: crypto.createHash('sha256').update(token).digest('hex'),
      proof_upload_token_expires_at: '2099-01-01T00:00:00Z',
    },
    proofRpcBody: null,
    reviewBodies: [],
    settingsRpcCalls: 0,
    checkoutRequest: null,
    paymentCheckRequest: null,
    paymentCheckAmount: 4900,
    paymentApprovalCalls: 0,
    payment: null,
  };
  const server = dependencyServer(state);
  await new Promise((resolve) => server.listen(dependencyPort, '127.0.0.1', resolve));
  const child = startApi();
  t.after(() => close(child, server));
  await waitForApi(child);

  const publicSearch = await api('/api/public/artists?visitorToken=test');
  const { artists } = await publicSearch.json();
  assert.equal(publicSearch.status, 200);
  assert.equal(artists[0].latitude, -22.99);
  assert.equal(artists[0].longitude, -43.12);
  assert.equal('addressStreet' in artists[0], false);
  assert.equal('postalCode' in artists[0], false);

  const postalCode = await api('/api/public/location/postal-code/25240000').then((response) => response.json());
  assert.equal(postalCode.city, 'Duque de Caxias');
  assert.equal(postalCode.street, 'Rua Teste');

  const geocoded = await api('/api/public/location/geocode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      street: 'Rua Teste',
      number: '10',
      neighborhood: 'Centro',
      city: 'Duque de Caxias',
      state: 'Rio de Janeiro',
      postalCode: '25240-000',
    }),
  }).then((response) => response.json());
  assert.equal(geocoded.latitude, -22.7863);
  assert.equal(geocoded.longitude, -43.3071);

  const reversed = await api('/api/public/location/reverse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude: -22.7863, longitude: -43.3071 }),
  }).then((response) => response.json());
  assert.equal(reversed.postalCode, '25240-000');
  assert.equal(reversed.stateCode, 'RJ');

  const appointment = await api('/api/public/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      artistId,
      clientName: 'Cliente Seguro',
      clientPhone: '21999999999',
      clientEmail: 'cliente@example.test',
      date: '2099-06-01',
      time: '10:00',
      description: 'Projeto',
      depositCreditUsed: true,
    }),
  });
  const appointmentBody = await appointment.json();
  assert.equal(appointment.status, 200);
  assert.equal(appointmentBody.paymentStatus, 'pending_proof');
  assert.ok(appointmentBody.proofUploadToken);
  assert.equal(state.createdAppointments[0].deposit_credit_used, false);
  assert.equal(state.createdAppointments[0].deposit_paid, false);

  state.depositRequired = false;
  const noDeposit = await api('/api/public/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      artistId,
      clientName: 'Cliente Sem Sinal',
      clientPhone: '21999999998',
      clientEmail: 'sem-sinal@example.test',
      date: '2099-06-02',
      time: '10:00',
      description: '',
    }),
  }).then((response) => response.json());
  assert.equal(noDeposit.paymentStatus, 'not_required');
  assert.equal(noDeposit.proofUploadToken, '');

  const invalidDate = await api('/api/public/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ artistId, clientName: 'Teste', clientPhone: '21999999997', clientEmail: 'x@example.test', date: '2020-01-01', time: '10:00' }),
  });
  assert.equal(invalidDate.status, 400);

  assert.equal((await api(`/api/uploads/appointments/${appointmentId}/proof`, { method: 'POST', body: proofForm('') })).status, 400);
  assert.equal((await api(`/api/uploads/appointments/${appointmentId}/proof`, { method: 'POST', body: proofForm('wrong-token-that-is-long-enough-for-validation') })).status, 403);
  state.proofAppointment.proof_upload_token_expires_at = '2020-01-01T00:00:00Z';
  assert.equal((await api(`/api/uploads/appointments/${appointmentId}/proof`, { method: 'POST', body: proofForm(token) })).status, 403);
  state.proofAppointment.proof_upload_token_expires_at = '2099-01-01T00:00:00Z';
  const proof = await api(`/api/uploads/appointments/${appointmentId}/proof`, { method: 'POST', body: proofForm(token) });
  assert.equal(proof.status, 200);
  assert.equal(state.proofRpcBody.p_appointment_id, appointmentId);

  assert.equal((await api(`/api/me/appointments/${appointmentId}/proof/approve`, { method: 'POST' })).status, 401);
  const approvedProof = await api(`/api/me/appointments/${appointmentId}/proof/approve`, {
    method: 'POST',
    headers: { Authorization: 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: '{}',
  });
  assert.equal(approvedProof.status, 200);
  assert.equal(state.reviewBodies.at(-1).payment_status, 'paid_confirmed');
  const rejectedProof = await api(`/api/me/appointments/${appointmentId}/proof/reject`, {
    method: 'POST',
    headers: { Authorization: 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: 'Comprovante ilegivel' }),
  });
  assert.equal(rejectedProof.status, 200);
  assert.equal(state.reviewBodies.at(-1).payment_status, 'proof_rejected');
  const adminApprovedProof = await api(`/api/admin/appointments/${appointmentId}/proof/approve`, {
    method: 'POST',
    headers: { Authorization: 'Bearer admin-token', 'Content-Type': 'application/json' },
    body: '{}',
  });
  assert.equal(adminApprovedProof.status, 200);
  assert.equal(state.reviewBodies.at(-1).payment_status, 'paid_confirmed');

  state.activeAccess = false;
  const blockedUpdate = await api(`/api/me/artist/${artistId}`, {
    method: 'PUT',
    headers: { Authorization: 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(blockedUpdate.status, 403);
  assert.equal(state.settingsRpcCalls, 0);
  const blockedSchedule = await api(`/api/me/appointments/${appointmentId}/schedule`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: '2099-06-01', time: '10:00' }),
  });
  assert.equal(blockedSchedule.status, 403);
  state.activeAccess = true;
  const activeUpdate = await api(`/api/me/artist/${artistId}`, {
    method: 'PUT',
    headers: { Authorization: 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slug: 'seguro-tattoo',
      artisticName: 'Seguro Tattoo',
      realName: 'Seguro Tattoo',
      city: 'Rio de Janeiro',
      state: 'RJ',
      styles: [],
      accentColor: '#a855f7',
      pixKey: '',
      pixType: 'phone',
      depositValue: 0,
      depositRequired: false,
      customSlots: {},
      dateSlots: {},
      blockedDates: [],
      portfolio: [],
    }),
  });
  assert.equal(activeUpdate.status, 200);
  assert.equal(state.settingsRpcCalls, 1);

  const checkout = await api('/api/platform-payments/infinitepay-checkout', {
    method: 'POST',
    headers: { Authorization: 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ handle: 'attacker-handle', amountCents: 1 }),
  });
  assert.equal(checkout.status, 200);
  assert.equal(state.checkoutRequest.handle, 'env-handle');
  assert.equal(state.checkoutRequest.items[0].price, 4900);

  const webhookBody = {
    order_nsu: state.payment.external_reference,
    transaction_nsu: 'transaction-valid',
    invoice_slug: 'invoice-test',
  };
  const wrongReference = await api('/api/infinitepay/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...webhookBody, invoice_slug: 'wrong-invoice' }),
  });
  assert.equal(wrongReference.status, 400);
  assert.equal(state.paymentApprovalCalls, 0);
  const webhook = await api('/api/infinitepay/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(webhookBody),
  });
  assert.equal(webhook.status, 200);
  assert.equal(state.paymentApprovalCalls, 1);
  const duplicateWebhook = await api('/api/infinitepay/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(webhookBody),
  });
  assert.equal(duplicateWebhook.status, 200);
  assert.equal(state.paymentApprovalCalls, 1);

  state.payment = { ...state.payment, status: 'pending', external_reference: 'underpaid-ref' };
  state.paymentCheckAmount = 100;
  const underpaid = await api('/api/infinitepay/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...webhookBody, order_nsu: 'underpaid-ref' }),
  });
  assert.equal(underpaid.status, 400);
  assert.equal(state.paymentApprovalCalls, 1);
});
