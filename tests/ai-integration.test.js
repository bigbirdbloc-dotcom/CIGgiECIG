'use strict';

const assert = require('assert');
const http = require('http');
const { createAIClient, registerAIRoutes, MAX_PROMPT_CHARS } = require('../ai-integration');

function makeApp() {
  const routes = new Map();
  return {
    routes,
    get(path, middleware, handler) { routes.set('GET ' + path, { middleware, handler }); },
    post(path, middleware, handler) { routes.set('POST ' + path, { middleware, handler }); }
  };
}

function makeResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; }
  };
}

async function invoke(app, method, path, body) {
  const route = app.routes.get(method + ' ' + path);
  assert(route, 'missing route ' + method + ' ' + path);
  const req = { body: body };
  const res = makeResponse();
  await new Promise((resolve, reject) => {
    try {
      route.middleware(req, res, () => Promise.resolve(route.handler(req, res)).then(resolve, reject));
    } catch (error) { reject(error); }
  });
  return res;
}

async function run() {
  let passed = 0;
  const check = async (name, fn) => { await fn(); passed++; console.log('ok - ' + name); };

  await check('missing config disables AI and fails closed', async () => {
    const client = createAIClient({});
    assert.strictEqual(client.getStatus().enabled, false);
    await assert.rejects(() => client.complete('help me'), error => error.statusCode === 503);
  });

  const received = [];
  const provider = http.createServer((req, res) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      received.push({ url: req.url, authorization: req.headers.authorization, body: data });
      if (req.url === '/error') {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'provider details must not be passed through' }));
        return;
      }
      if (req.url === '/bad-json') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('not json');
        return;
      }
      if (req.url === '/slow') {
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ choices: [{ message: { content: 'late answer' } }] }));
        }, 500);
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content: 'Test answer' } }] }));
    });
  });
  await new Promise(resolve => provider.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + provider.address().port;

  try {
    await check('valid provider response is parsed and bearer auth is sent', async () => {
      const client = createAIClient({ AI_API_URL: base + '/ok', AI_API_KEY: 'test-only-secret', AI_MODEL: 'test-model', AI_TIMEOUT_MS: '1000' });
      assert.strictEqual(client.getStatus().enabled, true);
      assert.strictEqual(await client.complete('review this function'), 'Test answer');
      const sent = received[received.length - 1];
      assert.strictEqual(sent.authorization, 'Bearer test-only-secret');
      const parsed = JSON.parse(sent.body);
      assert.strictEqual(parsed.model, 'test-model');
      assert.strictEqual(parsed.messages[1].content, 'review this function');
    });

    await check('non-2xx provider response is safely mapped to 502', async () => {
      const client = createAIClient({ AI_API_URL: base + '/error', AI_API_KEY: 'test', AI_MODEL: 'test', AI_TIMEOUT_MS: '1000' });
      await assert.rejects(() => client.complete('hello'), error => error.statusCode === 502 && !error.message.includes('provider details'));
    });

    await check('malformed provider JSON is rejected', async () => {
      const client = createAIClient({ AI_API_URL: base + '/bad-json', AI_API_KEY: 'test', AI_MODEL: 'test', AI_TIMEOUT_MS: '1000' });
      await assert.rejects(() => client.complete('hello'), error => error.code === 'invalid_provider_response');
    });

    await check('provider timeout is bounded', async () => {
      const client = createAIClient({ AI_API_URL: base + '/slow', AI_API_KEY: 'test', AI_MODEL: 'test', AI_TIMEOUT_MS: '100' });
      await assert.rejects(() => client.complete('hello'), error => error.statusCode === 504);
    });

    await check('remote plain HTTP endpoint is rejected', async () => {
      const client = createAIClient({ AI_API_URL: 'http://example.com/v1/chat/completions', AI_API_KEY: 'test', AI_MODEL: 'test' });
      assert.strictEqual(client.getStatus().enabled, false);
      assert.strictEqual(client.getStatus().reason, 'invalid_endpoint');
    });

    await check('admin routes validate empty and oversized prompts', async () => {
      const app = makeApp();
      registerAIRoutes(app, { requireAdmin: (_req, _res, next) => next(), client: createAIClient({}) });
      const empty = await invoke(app, 'POST', '/api/admin/ai/chat', { prompt: '   ' });
      assert.strictEqual(empty.statusCode, 400);
      const long = await invoke(app, 'POST', '/api/admin/ai/chat', { prompt: 'x'.repeat(MAX_PROMPT_CHARS + 1) });
      assert.strictEqual(long.statusCode, 400);
    });

    await check('AI status and chat endpoints are registered behind admin middleware', async () => {
      const app = makeApp();
      const gate = (_req, _res, next) => next();
      registerAIRoutes(app, { requireAdmin: gate, client: createAIClient({}) });
      assert.strictEqual(app.routes.get('GET /api/admin/ai/status').middleware, gate);
      assert.strictEqual(app.routes.get('POST /api/admin/ai/chat').middleware, gate);
      const status = await invoke(app, 'GET', '/api/admin/ai/status');
      assert.strictEqual(status.body.enabled, false);
      const disabledChat = await invoke(app, 'POST', '/api/admin/ai/chat', { prompt: 'help' });
      assert.strictEqual(disabledChat.statusCode, 503);
    });
  } finally {
    await new Promise(resolve => provider.close(resolve));
  }

  console.log('ai-integration.test.js: ' + passed + ' passed, 0 failed');
}

run().catch(error => { console.error(error); process.exitCode = 1; });
