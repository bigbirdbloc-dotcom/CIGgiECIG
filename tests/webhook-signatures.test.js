'use strict';

const assert = require('assert');
const crypto = require('crypto');
const extra = require('../extra');
const PersonaAdapter = require('../adapters/persona');
const VeriffAdapter = require('../adapters/veriff');

function run() {
  let passed = 0;
  const check = (name, fn) => { fn(); passed++; console.log('ok - ' + name); };

  check('HMAC helper accepts correct signatures and rejects malformed ones', () => {
    const body = '{"event":"test"}';
    const secret = 'unit-test-secret';
    const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
    assert.strictEqual(extra.verifyHmac(body, signature, secret), true);
    assert.strictEqual(extra.verifyHmac(body, 'deadbeef', secret), false);
    assert.strictEqual(extra.verifyHmac(body, null, secret), false);
  });

  check('Persona adapter rejects malformed signatures without throwing', () => {
    const body = '{"data":{"id":"test"}}';
    const secret = 'unit-test-secret';
    const valid = crypto.createHmac('sha256', secret).update(body).digest('hex');
    assert.strictEqual(PersonaAdapter.verifyWebhook(body, secret, valid), true);
    assert.strictEqual(PersonaAdapter.verifyWebhook(body, secret, 'deadbeef'), false);
    assert.strictEqual(PersonaAdapter.verifyWebhook(body, secret, null), false);
  });

  check('Veriff adapter rejects malformed signatures without throwing', () => {
    const body = '{"verification":{"id":"test"}}';
    const secret = 'unit-test-secret';
    const valid = crypto.createHmac('sha256', secret).update(body).digest('hex');
    assert.strictEqual(VeriffAdapter.verifyWebhook(body, valid, secret), true);
    assert.strictEqual(VeriffAdapter.verifyWebhook(body, 'deadbeef', secret), false);
    assert.strictEqual(VeriffAdapter.verifyWebhook(body, null, secret), false);
  });

  check('Persona extra helper rejects malformed signature lengths', () => {
    const body = '{"event":"inquiry.completed"}';
    const secret = 'unit-test-secret';
    const timestamp = '1700000000';
    const valid = crypto.createHmac('sha256', secret).update(timestamp + '.' + body).digest('hex');
    assert.strictEqual(extra.verifyPersonaWebhook(body, { 'persona-signature': 't=' + timestamp + ',v1=' + valid }, secret), true);
    assert.strictEqual(extra.verifyPersonaWebhook(body, { 'persona-signature': 't=' + timestamp + ',v1=deadbeef' }, secret), false);
  });

  console.log('webhook-signatures.test.js: ' + passed + ' passed, 0 failed');
}

run();
