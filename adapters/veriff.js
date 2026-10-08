const crypto = require('crypto');

function verifyWebhook(rawBody, signature, secret) {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature.toLowerCase()));
}

module.exports = {
  verifyWebhook,
  status: 'verified',
  getStatus: () => ({ provider: 'Veriff', status: 'verified', note: 'HMAC-SHA256 body verification implemented.' })
};
