'use strict';

const assert = require('assert');
const { createAdminAuth } = require('../admin-auth');

function run() {
  let passed = 0;
  const check = (name, fn) => { fn(); passed++; console.log('ok - ' + name); };

  check('missing credentials disable admin authentication', () => {
    const auth = createAdminAuth({});
    assert.strictEqual(auth.isConfigured(), false);
    assert.strictEqual(auth.verifyPassword('admin'), false);
    assert.strictEqual(auth.verifyToken('9999999999999.invalid'), false);
  });

  check('configured password verifies and wrong password fails', () => {
    const auth = createAdminAuth({ password: 'test-password', sessionSecret: 'test-session-secret' });
    assert.strictEqual(auth.verifyPassword('test-password'), true);
    assert.strictEqual(auth.verifyPassword('wrong-password'), false);
  });

  check('valid signed session is accepted before expiry', () => {
    const now = Date.now();
    const auth = createAdminAuth({ password: 'test-password', sessionSecret: 'test-session-secret' });
    const token = auth.createToken(now + 60000);
    assert.strictEqual(auth.verifyToken(token, now), true);
  });

  check('tampered and expired sessions are rejected', () => {
    const now = Date.now();
    const auth = createAdminAuth({ password: 'test-password', sessionSecret: 'test-session-secret' });
    const token = auth.createToken(now + 60000);
    assert.strictEqual(auth.verifyToken(token + 'x', now), false);
    assert.strictEqual(auth.verifyToken(auth.createToken(now - 1), now), false);
    assert.strictEqual(auth.verifyToken('9999999999999.yes', now), false);
  });

  console.log('admin-auth.test.js: ' + passed + ' passed, 0 failed');
}

run();
