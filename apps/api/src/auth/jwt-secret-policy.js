'use strict';

const PLACEHOLDERS = new Set([
  'secret', 'changeme', 'change-me', 'password', 'jwt_secret',
  'your-secret', 'your_jwt_secret', 'development-secret', 'test-secret',
]);

/** Resolve a signing secret before Nest registers JwtModule. Never invent a fallback. */
function resolveJwtSecret(env = process.env) {
  const secret = typeof env.JWT_SECRET === 'string' ? env.JWT_SECRET.trim() : '';
  const environment = String(env.NODE_ENV || 'development').trim().toLowerCase();

  if (!secret) {
    throw new Error('JWT_SECRET must be configured before the API can start.');
  }
  if (PLACEHOLDERS.has(secret.toLowerCase())) {
    throw new Error('JWT_SECRET uses a known placeholder value; configure a unique secret.');
  }
  if (environment === 'production' && secret.length < 32) {
    throw new Error('Production JWT_SECRET must contain at least 32 characters.');
  }
  if (environment === 'production' && /^(.)\1+$/.test(secret)) {
    throw new Error('Production JWT_SECRET must not be a repeated-character value.');
  }
  return secret;
}

module.exports = { resolveJwtSecret };
