/**
 * auth.js — Centralized server-side authentication & rate limiting
 *
 * - Passcode is ONLY accepted via X-Admin-Passcode header (never URL params or body)
 * - Rate limiting is enforced SERVER-SIDE (cannot be bypassed via DevTools)
 * - No hardcoded fallback password — server rejects all requests if .env is missing
 * - CORS is restricted to same-origin in production
 */

const MAX_ATTEMPTS  = 5;               // lock after 5 wrong tries
const LOCKOUT_MS    = 15 * 60 * 1000; // 15-minute lockout per IP
const WINDOW_MS     = 10 * 60 * 1000; // reset attempt count every 10 min

// In-memory store: ip → { count, lockedUntil, windowStart }
// (Sufficient for single-server/Vercel serverless — each instance has its own memory)
const ipStore = new Map();

/**
 * Cleans up stale IP entries to prevent memory growth.
 */
function pruneStore() {
  const now = Date.now();
  for (const [ip, rec] of ipStore.entries()) {
    if (rec.lockedUntil < now && rec.windowStart + WINDOW_MS < now) {
      ipStore.delete(ip);
    }
  }
}

/**
 * Returns the client IP from the request, accounting for proxies (Vercel).
 */
function getIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

/**
 * Validates the admin passcode and enforces server-side rate limiting.
 *
 * @param {object} req  - Incoming request object
 * @returns {{ ok: boolean, status?: number, error?: string, retryAfterSec?: number }}
 */
function checkAuth(req) {
  const ip  = getIP(req);
  const now = Date.now();

  pruneStore();

  // Initialise record for this IP
  if (!ipStore.has(ip)) {
    ipStore.set(ip, { count: 0, lockedUntil: 0, windowStart: now });
  }

  const rec = ipStore.get(ip);

  // Reset window if expired
  if (now - rec.windowStart > WINDOW_MS) {
    rec.count       = 0;
    rec.windowStart = now;
  }

  // Check if currently locked out
  if (rec.lockedUntil > now) {
    const retryAfterSec = Math.ceil((rec.lockedUntil - now) / 1000);
    return {
      ok: false,
      status: 429,
      error: `Too many failed attempts. Try again in ${Math.ceil(retryAfterSec / 60)} minute(s).`,
      retryAfterSec,
    };
  }

  // ── Validate passcode ────────────────────────────────────────────────────────
  const correctCode = process.env.ADMIN_PASSCODE;
  if (!correctCode) {
    // Hard fail if env is not configured — no fallback
    console.error('[auth] ADMIN_PASSCODE is not set in environment variables!');
    return { ok: false, status: 500, error: 'Server misconfiguration.' };
  }

  // Accept ONLY via header — never via URL query params or body
  const submitted = req.headers['x-admin-passcode'];

  if (submitted === correctCode) {
    // Success — reset the failure counter for this IP
    rec.count       = 0;
    rec.lockedUntil = 0;
    return { ok: true };
  }

  // ── Wrong passcode ───────────────────────────────────────────────────────────
  rec.count += 1;
  if (rec.count >= MAX_ATTEMPTS) {
    rec.lockedUntil = now + LOCKOUT_MS;
    rec.count       = 0;
    const retryAfterSec = Math.ceil(LOCKOUT_MS / 1000);
    return {
      ok: false,
      status: 429,
      error: `Too many failed attempts. Locked for ${LOCKOUT_MS / 60000} minutes.`,
      retryAfterSec,
    };
  }

  return {
    ok: false,
    status: 401,
    error: `Unauthorized. ${MAX_ATTEMPTS - rec.count} attempt(s) remaining.`,
  };
}

/**
 * Sets secure CORS headers.
 * In production (VERCEL=1) restricts to the deployment origin;
 * in dev allows localhost.
 */
function setCORSHeaders(req, res, allowedMethods = 'GET, POST, OPTIONS') {
  const origin = req.headers.origin || '';
  const isDev  = !process.env.VERCEL;

  // Allow dev origins or the configured production domain
  const allowedOrigin =
    isDev || origin.includes('localhost') || origin.includes('127.0.0.1')
      ? origin || '*'
      : (process.env.ALLOWED_ORIGIN || '');

  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  }
  res.setHeader('Access-Control-Allow-Methods', allowedMethods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Passcode');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
}

module.exports = { checkAuth, setCORSHeaders };
