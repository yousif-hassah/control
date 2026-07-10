const { sbGet, sbInsert, sbDelete } = require('./supabase');
const fs = require('fs');
const path = require('path');

const LOCAL_FILE = path.resolve(process.cwd(), 'api/projects.json');
const KNOWLEDGE_FILE = path.resolve(process.cwd(), 'api/knowledge.json');

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

function syncKnowledge(project, remove = false) {
  if (!fs.existsSync(KNOWLEDGE_FILE)) return;
  try {
    let kb = JSON.parse(fs.readFileSync(KNOWLEDGE_FILE, 'utf8') || '[]');
    const kbId = `project_${project.id.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    if (remove) {
      kb = kb.filter(c => c.id !== kbId);
    } else {
      const keywords = [
        project.title.toLowerCase(),
        ...project.title.toLowerCase().split(/\s+/),
        'مشروع', 'اعمال',
      ].filter((v, i, a) => v.length > 2 && a.indexOf(v) === i);

      kb.push({
        id: kbId,
        category: 'projects',
        keywords,
        content: `مشروع ${project.title} (${project.link_url !== '#' && project.link_url ? 'رابط المعاينة: ' + project.link_url : 'مشروع داخلي'}): ${project.description}`,
      });
    }

    fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify(kb, null, 2), 'utf8');
  } catch (e) {
    console.warn('[projects] Knowledge sync error:', e.message);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Passcode');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET — Public project list ────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const rows = await sbGet('projects', 'select=*&order=created_at.asc');
      // Map snake_case Supabase columns → camelCase used by frontend
      const projects = rows.map(p => ({
        id: p.id,
        title: p.title,
        description: p.description,
        imageUrl: p.image_url || '',
        linkUrl: p.link_url || '#',
        createdAt: p.created_at,
      }));
      return res.status(200).json(projects);
    } catch (err) {
      console.warn('[projects] Supabase GET failed, using local fallback:', err.message);
      return res.status(200).json(localRead());
    }
  }

  // ── POST — Add project (admin only) ─────────────────────────────────────────
  if (req.method === 'POST') {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

    const { title, description, imageUrl, linkUrl } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required.' });
    }

    const project = {
      id: 'PROJ-' + Date.now(),
      title,
      description,
      image_url: imageUrl || '',
      link_url: linkUrl || '#',
    };

    try {
      const saved = await sbInsert('projects', project);
      const out = {
        id: saved.id,
        title: saved.title,
        description: saved.description,
        imageUrl: saved.image_url || '',
        linkUrl: saved.link_url || '#',
        createdAt: saved.created_at,
      };
      syncKnowledge({ ...project, link_url: project.link_url });
      return res.status(200).json({ success: true, project: out });
    } catch (err) {
      console.warn('[projects] Supabase INSERT failed, using local fallback:', err.message);
      const all = localRead();
      const localProj = {
        id: project.id,
        title,
        description,
        imageUrl: imageUrl || '',
        linkUrl: linkUrl || '#',
        createdAt: Date.now(),
      };
      all.push(localProj);
      localWrite(all);
      syncKnowledge({ ...project, link_url: linkUrl || '#' });
      return res.status(200).json({ success: true, project: localProj });
    }
  }

  // ── DELETE — Remove project (admin only) ─────────────────────────────────────
  if (req.method === 'DELETE') {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id is required.' });

    try {
      await sbDelete('projects', { id });
      syncKnowledge({ id }, true);
      return res.status(200).json({ success: true });
    } catch (err) {
      console.warn('[projects] Supabase DELETE failed, using local fallback:', err.message);
      let all = localRead();
      if (!all.some(p => p.id === id)) return res.status(404).json({ error: 'Not found.' });
      all = all.filter(p => p.id !== id);
      localWrite(all);
      syncKnowledge({ id }, true);
      return res.status(200).json({ success: true });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
