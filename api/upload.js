const { sbUpload } = require('./supabase');
const fs = require('fs');
const path = require('path');

const STORAGE_BUCKET = 'project-images';

function isAdmin(req) {
  const code = req.headers['x-admin-passcode'] || req.query?.passcode;
  const correctCode = process.env.ADMIN_PASSCODE || 'control2026';
  return code === correctCode;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Passcode');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Content-Type must be multipart/form-data' });
    }

    // Parse boundary
    const boundaryMatch = contentType.match(/boundary=(.+)$/);
    if (!boundaryMatch) return res.status(400).json({ error: 'No boundary found' });

    const boundary = '--' + boundaryMatch[1];
    const buffer = req.rawBody;
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
      console.warn('[upload] Supabase Storage failed, saving locally:', uploadErr.message);

      // Fallback: save locally in img.projects/
      const uploadDir = path.resolve(process.cwd(), 'img.projects');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const targetPath = path.join(uploadDir, uniqueFilename);
      fs.writeFileSync(targetPath, fileBuffer);
      return res.status(200).json({ success: true, filePath: `img.projects/${uniqueFilename}` });
    }

  } catch (err) {
    return res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
};
