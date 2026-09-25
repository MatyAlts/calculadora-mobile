import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, test } from 'node:test';
import type { Server } from 'node:http';
import { app } from '../src/app.js';

let server: Server | undefined;
let baseUrl: string;
before(async () => {
  // Set API_TEST_URL to run this same contract against the production container.
  if (process.env.API_TEST_URL) {
    baseUrl = process.env.API_TEST_URL;
  } else {
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    baseUrl = `http://127.0.0.1:${address.port}`;
  }
});
after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
});

const post = (body: string, contentType = 'application/json') => fetch(`${baseUrl}/calculate`, {
  method: 'POST', headers: { 'Content-Type': contentType }, body,
});

test('health endpoint reports readiness', async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('HTTP contract returns all four results', async () => {
  for (const [operation, result] of [['add', 12], ['subtract', 4], ['multiply', 32], ['divide', 2]]) {
    const response = await post(JSON.stringify({ a: 8, b: 4, operation }));
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type')!, /application\/json/);
    assert.deepEqual(await response.json(), { result });
  }
});

test('HTTP failures have predictable codes and readable messages', async () => {
  const cases: [string, number, string, string?][] = [
    ['{"a":1,"b":0,"operation":"divide"}', 400, 'DIVISION_BY_ZERO'],
    ['{"a":"1","b":2,"operation":"add"}', 400, 'INVALID_INPUT'],
    ['{"a":1e400,"b":2,"operation":"add"}', 400, 'INVALID_INPUT'],
    ['{"a":1e308,"b":1e308,"operation":"multiply"}', 400, 'RESULT_OUT_OF_RANGE'],
    ['{"a":1,"b":2,"operation":"power"}', 400, 'INVALID_OPERATION'],
    ['{"a":1,"b":2}', 400, 'INVALID_OPERATION'],
    ['{"a":1,"operation":"add"}', 400, 'INVALID_INPUT'],
    ['{"a":1,"b":2,"operation":"add","extra":true}', 400, 'INVALID_INPUT'],
    ['[]', 400, 'INVALID_INPUT'],
    ['null', 400, 'INVALID_JSON'],
    ['', 400, 'INVALID_INPUT'],
    ['{broken', 400, 'INVALID_JSON'],
    ['{}', 415, 'UNSUPPORTED_MEDIA_TYPE', 'text/plain'],
    [JSON.stringify({ padding: 'x'.repeat(5000) }), 413, 'PAYLOAD_TOO_LARGE'],
  ];
  for (const [body, status, code, contentType] of cases) {
    const response = await post(body, contentType);
    assert.equal(response.status, status, body.slice(0, 80));
    const payload = await response.json() as { error: { code: string; message: string } };
    assert.equal(payload.error.code, code);
    assert.ok(payload.error.message.length > 0);
  }
});

test('unknown endpoints return JSON 404', async () => {
  const response = await fetch(`${baseUrl}/missing`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: { code: 'NOT_FOUND', message: 'Endpoint not found.' } });
});
