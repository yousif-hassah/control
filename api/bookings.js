const { sbGet, sbInsert, sbUpdate, sbDelete } = require('./supabase');
const { checkAuth, setCORSHeaders } = require('./auth');
const fs = require('fs');
const path = require('path');

// Local JSON fallback path — kept at root to avoid Vercel filename conflicts with api/bookings.js
const LOCAL_FILE = path.resolve(process.cwd(), 'bookings.json');

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

/**
 * Sends a notification email to controltxt.11@gmail.com via Resend when a new booking is created.
 */
async function sendNotificationEmail(booking) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[bookings] RESEND_API_KEY is not defined in environment variables.');
    return;
  }

  const waPhone = booking.phone.replace(/[^0-9]/g, '');
  const waLink = waPhone.startsWith('0') ? '964' + waPhone.substring(1) : waPhone;

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050505; color: #f5f5f7; padding: 40px 20px; max-width: 600px; margin: 0 auto; border-radius: 16px; border: 1px solid #18181c;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 24px; font-weight: 800; letter-spacing: 2px; color: #ffffff; margin: 0;">CONTROL™</h1>
        <p style="font-size: 12px; color: #86868b; letter-spacing: 1px; text-transform: uppercase; margin-top: 5px;">Operations Integrity System</p>
      </div>
      
      <div style="background-color: #0f0f11; border-radius: 12px; padding: 24px; border: 1px solid #1c1c21; margin-bottom: 24px;">
        <h2 style="font-size: 18px; font-weight: 700; color: #f5f5f7; margin-top: 0; margin-bottom: 20px; border-bottom: 1px solid #1c1c21; padding-bottom: 10px;">
          New Consultation Booking
        </h2>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #86868b; font-size: 13px; width: 120px;">Booking ID:</td>
            <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 600;">${booking.id}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #86868b; font-size: 13px;">Date requested:</td>
            <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 600;">${booking.date}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #86868b; font-size: 13px;">Client Name:</td>
            <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 600;">${booking.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #86868b; font-size: 13px;">Phone / WhatsApp:</td>
            <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 600;"><a href="https://wa.me/${waLink}" style="color: #30d158; text-decoration: none; font-weight: bold;">${booking.phone} (Chat)</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #86868b; font-size: 13px;">Email:</td>
            <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 600;">${booking.email ? `<a href="mailto:${booking.email}" style="color: #2997ff; text-decoration: none;">${booking.email}</a>` : '—'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #86868b; font-size: 13px;">Service Type:</td>
            <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 600;">${booking.service}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #86868b; font-size: 13px;">Budget:</td>
            <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 600;">${booking.budget || '—'}</td>
          </tr>
        </table>
        
        ${booking.project ? `
        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #1c1c21;">
          <h3 style="font-size: 11px; text-transform: uppercase; color: #86868b; margin-top: 0; margin-bottom: 8px; letter-spacing: 0.5px;">Project Description:</h3>
          <p style="font-size: 14px; line-height: 1.6; color: #ffffff; margin: 0; background: rgba(255,255,255,0.02); padding: 12px; border-radius: 8px; border-left: 2px solid #86868b;">${booking.project}</p>
        </div>` : ''}

        ${booking.notes ? `
        <div style="margin-top: 15px;">
          <h3 style="font-size: 11px; text-transform: uppercase; color: #86868b; margin-top: 0; margin-bottom: 8px; letter-spacing: 0.5px;">Notes / Custom Requests:</h3>
          <p style="font-size: 14px; line-height: 1.6; color: #86868b; margin: 0;">${booking.notes}</p>
        </div>` : ''}
      </div>

      <div style="text-align: center;">
        <a href="https://www.controlcode.click/admin" style="display: inline-block; padding: 12px 24px; background-color: #ffffff; color: #000000; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Open Admin Panel</a>
      </div>
    </div>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'CONTROL Bookings <onboarding@resend.dev>',
        to: ['controltxt.11@gmail.com'],
        subject: `New Booking Consultation: ${booking.name}`,
        html: htmlContent
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[bookings] Resend API error:', errorText);
    } else {
      console.log('[bookings] Notification email sent successfully.');
    }
  } catch (err) {
    console.error('[bookings] Failed to send email via Resend:', err.message);
  }
}

module.exports = async function handler(req, res) {
  setCORSHeaders(req, res, 'GET, POST, PATCH, DELETE, OPTIONS');

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
      await sendNotificationEmail(booking);
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

          await sendNotificationEmail(booking);

          return res.status(200).json({ success: true, booking: { ...saved, email: booking.email } });
        } catch (err2) {
          console.warn('[bookings] Retry without email also failed:', err2.message);
        }
      }

      // Full local fallback
      const all = localRead();
      all.push(booking);
      localWrite(all);
      await sendNotificationEmail(booking);
      return res.status(200).json({ success: true, booking });
    }
  }

  // ── GET — Fetch all bookings (admin only) ────────────────────────────────────
  if (req.method === 'GET') {
    const auth = checkAuth(req);
    if (!auth.ok) {
      if (auth.retryAfterSec) res.setHeader('Retry-After', auth.retryAfterSec);
      return res.status(auth.status).json({ error: auth.error });
    }

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
    const auth = checkAuth(req);
    if (!auth.ok) {
      if (auth.retryAfterSec) res.setHeader('Retry-After', auth.retryAfterSec);
      return res.status(auth.status).json({ error: auth.error });
    }

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
    const auth = checkAuth(req);
    if (!auth.ok) {
      if (auth.retryAfterSec) res.setHeader('Retry-After', auth.retryAfterSec);
      return res.status(auth.status).json({ error: auth.error });
    }

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
