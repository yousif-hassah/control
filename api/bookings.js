const { sbGet, sbInsert, sbUpdate, sbDelete } = require('./supabase');
const fs = require('fs');
const path = require('path');

// Local JSON fallback path (used if Supabase is unavailable)
const LOCAL_FILE = path.resolve(process.cwd(), 'api/bookings.json');

function isAdmin(req) {
  const code = req.headers['x-admin-passcode'] || req.query?.passcode || req.body?.passcode;
  const correctCode = process.env.ADMIN_PASSCODE || 'control2026';
  return code === correctCode;
}

function localRead() {
  if (!fs.existsSync(LOCAL_FILE)) return [];
  return JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf8') || '[]');
}

function localWrite(data) {
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Passcode');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── POST — Create booking (public) ──────────────────────────────────────────
  if (req.method === 'POST') {
    const { name, phone, email, project, budget, service, notes, date } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required.' });
    }

    const booking = {
      id: 'BKG-' + Math.floor(100000 + Math.random() * 900000),
      name,
      phone,
      email: email || '',
      project: project || '',
      budget: budget || '',
      service: service || 'Other',
      notes: notes || '',
      date: date || new Date().toISOString().split('T')[0],
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    try {
      const saved = await sbInsert('bookings', booking);
      return res.status(200).json({ success: true, booking: saved || booking });
    } catch (err) {
      console.warn('[bookings] Supabase insert failed, using local fallback:', err.message);
      const all = localRead();
      all.push(booking);
      localWrite(all);
      return res.status(200).json({ success: true, booking });
    }
  }

  // ── GET — Fetch all bookings (admin only) ────────────────────────────────────
  if (req.method === 'GET') {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const rows = await sbGet('bookings', 'select=*&order=created_at.desc');
      return res.status(200).json(rows);
    } catch (err) {
      console.warn('[bookings] Supabase GET failed, using local fallback:', err.message);
      const rows = localRead().sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return (b.created_at || b.createdAt || 0) > (a.created_at || a.createdAt || 0) ? 1 : -1;
      });
      return res.status(200).json(rows);
    }
  }

  // ── PATCH — Update booking status (admin only) ───────────────────────────────
  if (req.method === 'PATCH') {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

    const { id, status } = req.body;
    if (!id || !status) return res.status(400).json({ error: 'id and status are required.' });

    const allowed = ['pending', 'confirmed', 'declined'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status.' });

    try {
      const updated = await sbUpdate('bookings', { id }, { status });
      return res.status(200).json({ success: true, booking: updated });
    } catch (err) {
      console.warn('[bookings] Supabase PATCH failed, using local fallback:', err.message);
      const all = localRead();
      const idx = all.findIndex(b => b.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Not found.' });
      all[idx].status = status;
      localWrite(all);
      return res.status(200).json({ success: true, booking: all[idx] });
    }
  }

  // ── DELETE — Remove booking (admin only) ─────────────────────────────────────
  if (req.method === 'DELETE') {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id is required.' });

    try {
      await sbDelete('bookings', { id });
      return res.status(200).json({ success: true });
    } catch (err) {
      console.warn('[bookings] Supabase DELETE failed, using local fallback:', err.message);
      let all = localRead();
      if (!all.some(b => b.id === id)) return res.status(404).json({ error: 'Not found.' });
      all = all.filter(b => b.id !== id);
      localWrite(all);
      return res.status(200).json({ success: true });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
