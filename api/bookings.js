const { sbGet, sbInsert, sbUpdate, sbDelete } = require('./supabase');
const fs = require('fs');
const path = require('path');

// Local JSON fallback path
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
  try {
    fs.writeFileSync(LOCAL_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn('[bookings] Local write failed (read-only file system):', err.message);
  }
}

/**
 * Returns all booked dates (pending + confirmed) from both Supabase and local JSON.
 * Used to enforce one-booking-per-day on POST, and to expose the public ?dates=true route.
 */
async function getBookedDates() {
  const localDates = new Set(
    localRead()
      .filter(b => b.status !== 'declined')
      .map(b => b.date)
  );

  try {
    const rows = await sbGet('bookings', 'select=date,status');
    rows
      .filter(r => r.status !== 'declined')
      .forEach(r => localDates.add(r.date));
  } catch (err) {
    console.warn('[bookings] Could not fetch dates from Supabase for conflict check:', err.message);
  }

  return localDates; // Set<string> of "YYYY-MM-DD"
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Passcode');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET ?dates=true — Public: return list of taken dates ─────────────────────
  if (req.method === 'GET' && req.query?.dates === 'true') {
    const taken = await getBookedDates();
    return res.status(200).json([...taken]);
  }

  // ── POST — Create booking (public) ──────────────────────────────────────────
  if (req.method === 'POST') {
    const { name, phone, email, project, budget, service, notes, date } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required.' });
    }

    const requestedDate = date || new Date().toISOString().split('T')[0];

    // ── Enforce one booking per day ──────────────────────────────────────────
    const takenDates = await getBookedDates();
    if (takenDates.has(requestedDate)) {
      return res.status(409).json({
        error: 'This date is already booked. Please choose a different day.',
      });
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
      date: requestedDate,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    try {
      const saved = await sbInsert('bookings', booking);
      return res.status(200).json({ success: true, booking: saved || booking });
    } catch (err) {
      console.warn('[bookings] Supabase insert failed, trying fallback options:', err.message);

      // If missing email column, retry without it
      if (err.message.includes('email') || err.message.includes('PGRST204')) {
        try {
          const { email: _, ...bookingWithoutEmail } = booking;
          const saved = await sbInsert('bookings', bookingWithoutEmail);

          // Save full booking locally so the email isn't lost
          const all = localRead();
          all.push(booking);
          localWrite(all);

          return res.status(200).json({ success: true, booking: { ...saved, email: booking.email } });
        } catch (err2) {
          console.warn('[bookings] Retry without email also failed:', err2.message);
        }
      }

      // Full local fallback
      const all = localRead();
      all.push(booking);
      localWrite(all);
      return res.status(200).json({ success: true, booking });
    }
  }

  // ── GET — Fetch all bookings (admin only) ────────────────────────────────────
  if (req.method === 'GET') {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

    let supabaseRows = [];
    let supabaseFailed = false;

    try {
      supabaseRows = await sbGet('bookings', 'select=*&order=created_at.desc');
    } catch (err) {
      console.warn('[bookings] Supabase GET failed, using local fallback:', err.message);
      supabaseFailed = true;
    }

    const localRows = localRead();
    let allBookings = [];

    if (supabaseFailed) {
      allBookings = localRows;
    } else {
      // Merge: Supabase records + any local-only records not yet in Supabase
      const sbIds = new Set(supabaseRows.map(r => r.id));
      const uniqueLocal = localRows.filter(r => !sbIds.has(r.id));
      allBookings = [...supabaseRows, ...uniqueLocal];
    }

    // Sort: pending first, then newest first
    allBookings.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0);
    });

    // Normalize: ensure both key names exist
    const normalized = allBookings.map(b => ({
      ...b,
      createdAt: b.created_at || b.createdAt,
    }));

    return res.status(200).json(normalized);
  }

  // ── PATCH — Update booking status (admin only) ───────────────────────────────
  if (req.method === 'PATCH') {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

    const { id, status } = req.body;
    if (!id || !status) return res.status(400).json({ error: 'id and status are required.' });

    const allowed = ['pending', 'confirmed', 'declined'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status.' });

    // Update local first for consistency
    let localUpdated = null;
    try {
      const all = localRead();
      const idx = all.findIndex(b => b.id === id);
      if (idx !== -1) {
        all[idx].status = status;
        localWrite(all);
        localUpdated = all[idx];
      }
    } catch (localErr) {
      console.warn('[bookings] Local status update failed:', localErr.message);
    }

    try {
      const updated = await sbUpdate('bookings', { id }, { status });
      return res.status(200).json({ success: true, booking: updated || localUpdated });
    } catch (err) {
      console.warn('[bookings] Supabase PATCH failed, using local fallback:', err.message);
      if (localUpdated) return res.status(200).json({ success: true, booking: localUpdated });
      return res.status(404).json({ error: 'Not found.' });
    }
  }

  // ── DELETE — Remove booking (admin only) ─────────────────────────────────────
  if (req.method === 'DELETE') {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id is required.' });

    // Delete local first
    try {
      let all = localRead();
      if (all.some(b => b.id === id)) {
        all = all.filter(b => b.id !== id);
        localWrite(all);
      }
    } catch (localErr) {
      console.warn('[bookings] Local delete failed:', localErr.message);
    }

    try {
      await sbDelete('bookings', { id });
      return res.status(200).json({ success: true });
    } catch (err) {
      console.warn('[bookings] Supabase DELETE failed, using local fallback:', err.message);
      return res.status(200).json({ success: true });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
