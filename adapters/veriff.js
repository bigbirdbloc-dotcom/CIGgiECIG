const crypto = require('crypto');

function verifyWebhook(rawBody, signature, secret) {
  if (!secret || typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const providedBuffer = Buffer.from(signature, 'hex');
  return expectedBuffer.length === providedBuffer.length && crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

module.exports = {
  verifyWebhook,
  status: 'verified',
  getStatus: () => ({ provider: 'Veriff', status: 'verified', note: 'HMAC-SHA256 body verification implemented.' })
};
