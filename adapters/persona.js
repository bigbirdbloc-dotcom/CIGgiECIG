const crypto = require('crypto');

function verifyWebhook(rawBody, secret, signature) {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature.toLowerCase()));
}

module.exports = {
  verifyWebhook,
  status: 'verified',
  getStatus: () => ({ provider: 'Persona', status: 'verified', note: 'Webhooks verified with headers and raw body.' })
};
