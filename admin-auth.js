'use strict';

const crypto = require('crypto');
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function constantTimeStringEqual(left, right) {
  const leftDigest = crypto.createHash('sha256').update(String(left)).digest();
  const rightDigest = crypto.createHash('sha256').update(String(right)).digest();
  return crypto.timingSafeEqual(leftDigest, rightDigest);
}

function createAdminAuth(options = {}) {
  const password = String(options.password || '');
  const sessionSecret = String(options.sessionSecret || '');
  const ttlMs = Number.isFinite(options.ttlMs) && options.ttlMs > 0
    ? Math.min(options.ttlMs, ADMIN_SESSION_TTL_MS)
    : ADMIN_SESSION_TTL_MS;

  function isConfigured() {
    return Boolean(password && sessionSecret);
  }

  function verifyPassword(candidate) {
    return isConfigured() && typeof candidate === 'string' && constantTimeStringEqual(candidate, password);
  }

  function sign(expiry) {
    return crypto.createHmac('sha256', sessionSecret).update(String(expiry)).digest('base64url');
  }

  function createToken(expiry) {
    if (!isConfigured()) throw new Error('Admin auth is not configured.');
    if (!Number.isSafeInteger(expiry)) throw new TypeError('Expiry must be an integer timestamp.');
    return String(expiry) + '.' + sign(expiry);
  }

  function verifyToken(token, now = Date.now()) {
    if (!isConfigured() || typeof token !== 'string' || token.length > 160) return false;
    const separator = token.indexOf('.');
    if (separator <= 0 || separator === token.length - 1) return false;
    const expiry = Number(token.slice(0, separator));
    const signature = token.slice(separator + 1);
    if (!Number.isSafeInteger(expiry) || expiry <= now || expiry > now + ttlMs + 60000) return false;
    return constantTimeStringEqual(signature, sign(expiry));
  }

  return { isConfigured, verifyPassword, createToken, verifyToken, ttlMs };
}

module.exports = { ADMIN_SESSION_TTL_MS, createAdminAuth, constantTimeStringEqual };
