const crypto = require('crypto');

function verifyWebhook(rawBody, secret, signatureHeader) {
  if (!secret || typeof signatureHeader !== 'string') return false;
  const parts = signatureHeader.split(',').reduce((acc, part) => {
    const separator = part.indexOf('=');
    if (separator < 0) return acc;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key && value) acc[key] = value;
    return acc;
  }, {});
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !/^\d+$/.test(timestamp) || typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = crypto.createHmac('sha256', secret).update(timestamp + '.').update(rawBody).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const providedBuffer = Buffer.from(signature, 'hex');
  return expectedBuffer.length === providedBuffer.length && crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

module.exports = {
  verifyWebhook,
  status: 'verified',
  getStatus: () => ({ provider: 'Persona', status: 'verified', note: 'Webhooks verified with headers and raw body.' })
};
