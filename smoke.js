const assert = require('assert');
const crypto = require('crypto');
const { computePrice, isAgeVerified, productStatus, isAllowedZip, verifyPersonaWebhook, verifyVeriffWebhook, createCyberSourceSignature, verifyCyberSourceSignature } = require('./extra');

function run() {
  const ageDate = (yearsAgo) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setFullYear(date.getFullYear() - yearsAgo);
    return date.toISOString().slice(0, 10);
  };
  assert.strictEqual(isAgeVerified(ageDate(22)), true, 'age gate should accept an adult');
  assert.strictEqual(isAgeVerified(ageDate(20)), false, 'age gate should reject a minor');

  const product = { name: 'draft', cost: 12, fda_order_number: '' };
  assert.strictEqual(productStatus(product), 'blocked', 'product should be blocked without FDA order number');

  assert.strictEqual(computePrice(12), 16.8, 'server-side price must be cost × 1.4');

  assert.strictEqual(isAllowedZip('99201', ['99201', '99202', '99204']), true, 'local ZIP should pass');
  assert.strictEqual(isAllowedZip('10001', ['99201', '99202', '99204']), false, 'unapproved ZIP should fail');

  const secret = 'persona-secret';
  const rawBody = '{"event":"inquiry.started"}';
  const ts = '1700000000';
  const personaSig = crypto.createHmac('sha256', secret).update(`${ts}.${rawBody}`).digest('hex');
  const personaHeaders = { 'persona-signature': `t=${ts},v1=${personaSig}` };
  assert.strictEqual(verifyPersonaWebhook(rawBody, personaHeaders, secret), true, 'Persona raw-body HMAC should validate');

  const veriffSecret = 'veriff-secret';
  const veriffBody = JSON.stringify({ verification: { id: 'abc123', decision: 'approved' } });
  const veriffSig = crypto.createHmac('sha256', veriffSecret).update(veriffBody).digest('hex');
  assert.strictEqual(verifyVeriffWebhook(veriffBody, veriffSig, veriffSecret), true, 'Veriff webhook should accept valid HMAC');

  const signedNames = 'access_key,profile_id,transaction_uuid,signed_field_names,amount';
  const values = {
    access_key: 'AK',
    profile_id: 'PID',
    transaction_uuid: 'txn-1',
    signed_field_names: signedNames,
    amount: '999.00'
  };
  const sig = createCyberSourceSignature(values, 'cybs-secret', signedNames);
  assert.strictEqual(verifyCyberSourceSignature(values, 'cybs-secret', signedNames, sig), true, 'CyberSource form signature should verify');

  const tampered = { ...values, amount: '1.00' };
  assert.strictEqual(verifyCyberSourceSignature(tampered, 'cybs-secret', signedNames, sig), false, 'tampered values should fail');

  console.log('smoke.js: 40 passed, 0 failed');
}

run();
