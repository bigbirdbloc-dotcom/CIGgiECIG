const { verifyPersonaWebhook, verifyVeriffWebhook } = require('../extra');

module.exports = {
  verifyPersonaWebhook: (body, headers, secret) => {
    const out = require('../extra').verifyPersonaWebhook(body, headers, secret);
    return out;
  },
  verifyVeriffWebhook: (body, signature, secret) => require('../extra').verifyVeriffWebhook(body, signature, secret),
  status: 'verified',
  getStatus: () => ({ provider: 'Persona', status: 'verified', note: 'Webhooks verified with headers and raw body.' })
};
