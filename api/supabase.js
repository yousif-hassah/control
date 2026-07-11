/**
 * Supabase helper — lightweight wrapper around the REST API
 * Works in Node.js without installing @supabase/supabase-js
 */

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const REST = SUPABASE_URL ? `${SUPABASE_URL}/rest/v1` : '';

function checkConfig() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables in Vercel.');
  }
}

/**
 * @param {string} table  e.g. "bookings"
 * @param {string} query  PostgREST query string, e.g. "select=*&status=eq.pending"
 * @param {string} [prefer] e.g. "return=representation"
 */
async function sbGet(table, query = 'select=*') {
  checkConfig();
  const res = await fetch(`${REST}/${table}?${query}`, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase GET ${table} failed (${res.status}): ${body}`);
  }
  return res.json();
}

async function sbInsert(table, data) {
  checkConfig();
  const res = await fetch(`${REST}/${table}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase INSERT ${table} failed (${res.status}): ${body}`);
  }
  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] : rows;
}

async function sbUpdate(table, match, data) {
  checkConfig();
  const matchStr = Object.entries(match)
    .map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`)
    .join('&');
  const res = await fetch(`${REST}/${table}?${matchStr}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase UPDATE ${table} failed (${res.status}): ${body}`);
  }
  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] : rows;
}

async function sbDelete(table, match) {
  checkConfig();
  const matchStr = Object.entries(match)
    .map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`)
    .join('&');
  const res = await fetch(`${REST}/${table}?${matchStr}`, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase DELETE ${table} failed (${res.status}): ${body}`);
  }
  return true;
}

/**
 * Upload a file buffer to Supabase Storage
 * @param {string} bucket  e.g. "project-images"
 * @param {string} filename e.g. "1720000000.png"
 * @param {Buffer} buffer
 * @param {string} mimeType e.g. "image/png"
 * @returns {string} public URL
 */
async function sbUpload(bucket, filename, buffer, mimeType) {
  checkConfig();
  const storageUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${filename}`;
  const res = await fetch(storageUrl, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': mimeType,
      'Cache-Control': '3600',
      'x-upsert': 'true',
    },
    body: buffer,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase Storage upload failed (${res.status}): ${body}`);
  }
  // Return the public URL
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filename}`;
}

module.exports = { sbGet, sbInsert, sbUpdate, sbDelete, sbUpload };
