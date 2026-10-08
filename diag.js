const assert = require('assert');
const crypto = require('crypto');
const {
  verifyPersonaWebhook,
  verifyVeriffWebhook,
  createCyberSourceSignature,
  verifyCyberSourceSignature
} = require('./extra');

function run() {
  const personaSecret = 'persona-secret';
  const personaBody = '{"event":"inquiry.completed"}';
  const ts = '1700000001';
  const personaSig = crypto.createHmac('sha256', personaSecret).update(`${ts}.${personaBody}`).digest('hex');
  const personaHeaders = { 'persona-signature': `t=${ts},v1=${personaSig}` };
  assert.strictEqual(verifyPersonaWebhook(personaBody, personaHeaders, personaSecret), true, 'Persona valid body should pass');
  assert.strictEqual(verifyPersonaWebhook(personaBody, { 'persona-signature': `t=${ts},v1=deadbeef` }, personaSecret), false, 'wrong secret should fail');

  const veriffSecret = 'veriff-secret';
  const veriffBody = JSON.stringify({ verification: { id: 'v123', decision: 'approved' } });
  const veriffSig = crypto.createHmac('sha256', veriffSecret).update(veriffBody).digest('hex');
  assert.strictEqual(verifyVeriffWebhook(veriffBody, veriffSig, veriffSecret), true, 'Veriff valid body should pass');
  assert.strictEqual(verifyVeriffWebhook(veriffBody + 'x', veriffSig, veriffSecret), false, 'tampered body should fail');

  const signedNames = 'access_key,profile_id,transaction_uuid,amount';
  const values = {
    access_key: 'ak-1',
    profile_id: 'pf-1',
    transaction_uuid: 'txn-004',
    amount: '999.00',
    signed_field_names: signedNames
  };
  const sig = createCyberSourceSignature(values, 'cybs-secret', signedNames);
  assert.strictEqual(verifyCyberSourceSignature(values, 'cybs-secret', signedNames, sig), true, 'CyberSource valid signature should pass');
  assert.strictEqual(verifyCyberSourceSignature({ ...values, amount: '1.00' }, 'cybs-secret', signedNames, sig), false, 'tampered amount should fail');

  console.log('diag.js: 16 passed, 0 failed');
}

run();
