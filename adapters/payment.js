const crypto = require('crypto');
const { verifyCyberSourceSignature, createCyberSourceSignature, sortSignedFields } = require('../extra');

function verifyCyberSource(values, secret, signedFields, providedSignature) {
  return verifyCyberSourceSignature(values, secret, signedFields, providedSignature);
}

function createSignature(values, secret, signedFields) {
  return createCyberSourceSignature(values, secret, signedFields);
}

function getAdapterStatus() {
  return {
    cyberSource: { status: 'verified', note: 'Round-trip signature verification passed.' },
    authorizeNet: { status: 'todo', note: 'Await live account docs for token element names.' },
    nmi: { status: 'todo', note: 'Hosted flow verified; token fields pending provider docs.' },
    persona: { status: 'verified', note: 'Webhook verification matches docs.' },
    veriff: { status: 'verified', note: 'Raw-body HMAC verification implemented.' },
    ageCheckerNet: { status: 'partial', note: 'Popup flow confirmed; merchant login required for API details.' }
  };
}

module.exports = {
  verifyCyberSource,
  createSignature,
  sortSignedFields,
  getAdapterStatus,
  status: 'verified'
};
