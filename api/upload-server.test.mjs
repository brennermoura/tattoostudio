import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { test } from 'node:test';

function apiProcess(port, environment = {}) {
  return spawn(process.execPath, ['api/upload-server.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      API_PORT: String(port),
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://app.example.test',
      ...environment,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function waitForServer(child) {
  let output = '';
  child.stdout.setEncoding('utf8');
  for await (const chunk of child.stdout) {
    output += chunk;
    if (output.includes('Upload API em')) return;
  }
  throw new Error(`API encerrou antes de iniciar: ${output}`);
}

async function closeServer(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await once(child, 'exit');
}

test('production refuses to start without configured CORS origin', async () => {
  const child = apiProcess(18980, { CORS_ORIGIN: '' });
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });

  const [code] = await once(child, 'exit');
  assert.notEqual(code, 0);
  assert.match(stderr, /CORS_ORIGIN deve ser configurado em producao/);
});

test('production accepts configured browser origin and server-to-server requests only', async (t) => {
  const child = apiProcess(18981);
  t.after(() => closeServer(child));
  await waitForServer(child);

  const allowed = await fetch('http://127.0.0.1:18981/api/health', {
    headers: { Origin: 'https://app.example.test' },
  });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://app.example.test');

  const webhookStyle = await fetch('http://127.0.0.1:18981/api/health');
  assert.equal(webhookStyle.status, 200);

  const denied = await fetch('http://127.0.0.1:18981/api/health', {
    headers: { Origin: 'https://evil.example.test' },
  });
  assert.equal(denied.status, 403);
  assert.notEqual(denied.headers.get('access-control-allow-origin'), 'https://evil.example.test');
});
