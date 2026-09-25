import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';
import { calculateRemotely, validateApiUrl } from '../src/lib/api';

let baseUrl: string;
let sentBody = '';
const server = createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    sentBody = body;
    if (req.url === '/offline/calculate') { req.socket.destroy(); return; }
    if (req.url === '/slow/calculate') return;
    if (req.url === '/error/calculate') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'DIVISION_BY_ZERO', message: 'Cannot divide by zero.' } }));
      return;
    }
    if (req.url === '/invalid/calculate') { res.end('<html>Bad gateway</html>'); return; }
    if (req.url === '/wrong-type/calculate') { res.end('{"result":"12"}'); return; }
    // Deliberately not 8 + 4: verifies that the client uses the server response.
    res.end('{"result":123}');
  });
});
before(async () => {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  baseUrl = `http://127.0.0.1:${address.port}`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

const input = { a: 8, b: 4, operation: 'add' as const };
const options = (path = '') => ({ apiUrl: `${baseUrl}${path}`, allowHttp: true });

test('requires explicit URL configuration and HTTPS outside development', () => {
  assert.throws(() => validateApiUrl(undefined, true), /EXPO_PUBLIC_API_URL/);
  assert.throws(() => validateApiUrl('not a url', true), /valid/);
  assert.throws(() => validateApiUrl('http://localhost:3000', false), /HTTPS/);
  assert.throws(() => validateApiUrl('https://user:password@api.example.com', false), /credentials/);
  assert.equal(validateApiUrl('https://api.example.com/', false), 'https://api.example.com');
});

test('sends JSON to the API and returns the server result, never local arithmetic', async () => {
  assert.equal(await calculateRemotely(input, options()), 123);
  assert.deepEqual(JSON.parse(sentBody), input);
});

test('surfaces API errors and rejects malformed responses', async () => {
  await assert.rejects(calculateRemotely(input, options('/error')), /Cannot divide by zero/);
  await assert.rejects(calculateRemotely(input, options('/invalid')), /invalid response/);
  await assert.rejects(calculateRemotely(input, options('/wrong-type')), /invalid result/);
});

test('shows a network error instead of calculating offline', async () => {
  await assert.rejects(calculateRemotely(input, options('/offline')), /Cannot reach the backend/);
});

test('bounds waiting time and supports cancellation', async () => {
  await assert.rejects(calculateRemotely(input, { ...options('/slow'), timeoutMs: 50 }), /too long/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(calculateRemotely(input, { ...options(), signal: controller.signal }), /cancelled/);
});
