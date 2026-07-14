const { sbUpload } = require('./supabase');
const { checkAuth, setCORSHeaders } = require('./auth');
const fs = require('fs');
const path = require('path');

const STORAGE_BUCKET = 'project-images';

module.exports = async function handler(req, res) {
  setCORSHeaders(req, res, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = checkAuth(req);
  if (!auth.ok) {
    if (auth.retryAfterSec) res.setHeader('Retry-After', auth.retryAfterSec);
    return res.status(auth.status).json({ error: auth.error });
  }

  try {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Content-Type must be multipart/form-data' });
    }

    // Parse boundary
    const boundaryMatch = contentType.match(/boundary=(.+)$/);
    if (!boundaryMatch) return res.status(400).json({ error: 'No boundary found' });

    const boundary = '--' + boundaryMatch[1];
    let buffer = req.rawBody;
    if (!buffer) {
      buffer = await new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', err => reject(err));
      });
    }

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ error: 'Empty upload body' });
    }

    // Extract file from multipart body
    let fileBuffer = null;
    let originalName = 'upload.png';
    let mimeType = 'image/png';
    let lastIndex = 0;
    const parts = [];

    while (true) {
      const index = buffer.indexOf(boundary, lastIndex);
      if (index === -1) break;
      const nextIndex = buffer.indexOf(boundary, index + boundary.length);
      if (nextIndex === -1) break;
      parts.push(buffer.slice(index + boundary.length, nextIndex));
      lastIndex = nextIndex;
    }

    for (const part of parts) {
      const headerEnd = part.indexOf('\r\n\r\n');
      if (headerEnd === -1) continue;
      const headerText = part.slice(0, headerEnd).toString('utf8');
      if (!headerText.includes('filename=')) continue;

      const filenameMatch = headerText.match(/filename="([^"]+)"/);
      if (filenameMatch) originalName = filenameMatch[1];

      const mimeMatch = headerText.match(/Content-Type:\s*([^\r\n]+)/i);
      if (mimeMatch) mimeType = mimeMatch[1].trim();

      fileBuffer = part.slice(headerEnd + 4, part.length - 2);
      break;
    }

    if (!fileBuffer) return res.status(400).json({ error: 'No file found in payload' });

    const ext = path.extname(originalName) || '.png';
    const uniqueFilename = `${Date.now()}${ext}`;

    // Try Supabase Storage first
    try {
      const publicUrl = await sbUpload(STORAGE_BUCKET, uniqueFilename, fileBuffer, mimeType);
      return res.status(200).json({ success: true, filePath: publicUrl });
    } catch (uploadErr) {
      console.warn('[upload] Supabase Storage failed:', uploadErr.message);

      // On Vercel (or any read-only environment), local file writes are not possible.
      // Return a clear error so the admin knows to fix the Supabase bucket.
      if (process.env.VERCEL) {
        return res.status(503).json({
          error: 'Image upload failed: Supabase Storage bucket "project-images" is not configured. Please create a public bucket named "project-images" in your Supabase dashboard.'
        });
      }

      // Fallback (local dev only): save to img.projects/
      try {
        const uploadDir = path.resolve(process.cwd(), 'img.projects');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const targetPath = path.join(uploadDir, uniqueFilename);
        fs.writeFileSync(targetPath, fileBuffer);
        return res.status(200).json({ success: true, filePath: `img.projects/${uniqueFilename}` });
      } catch (fsErr) {
        console.warn('[upload] Local fallback also failed:', fsErr.message);
        return res.status(500).json({ error: 'Upload failed: ' + uploadErr.message });
      }
    }

  } catch (err) {
    return res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
};
