const db = require('../db');

async function listPublic(req, res, next) {
  try {
    const [homepage] = await db.execute(
      `SELECT id, section_key, title, body, image_path, is_published, sort_order, updated_at
       FROM homepage_contents WHERE is_published = 1 AND is_archived = 0 ORDER BY sort_order ASC, id ASC`
    );
    const [announcements] = await db.execute(
      `SELECT id, title, body, image_path, published_at, created_at
       FROM announcements WHERE is_published = 1 AND is_archived = 0
       AND (published_at IS NULL OR published_at <= NOW())
       ORDER BY COALESCE(published_at, created_at) DESC LIMIT 20`
    );
    return res.json({ success: true, homepage, announcements });
  } catch (error) { next(error); }
}

async function listAdmin(req, res, next) {
  try {
    const [homepage] = await db.execute('SELECT * FROM homepage_contents ORDER BY sort_order ASC, id ASC');
    const [announcements] = await db.execute('SELECT * FROM announcements ORDER BY created_at DESC, id DESC');
    return res.json({ success: true, homepage, announcements });
  } catch (error) { next(error); }
}

async function saveHomepage(req, res, next) {
  try {
    const sectionKey = String(req.body.section_key || '').trim();
    const title = String(req.body.title || '').trim();
    const body = String(req.body.body || '').trim();
    const imagePath = req.body.image_path ? String(req.body.image_path).trim() : null;
    const published = req.body.is_published === false || req.body.is_published === 0 ? 0 : 1;
    const sortOrder = Number.isFinite(Number(req.body.sort_order)) ? Number(req.body.sort_order) : 0;
    if (!/^[a-z0-9_-]{2,60}$/i.test(sectionKey) || !title || title.length > 180 || body.length > 10000) {
      return res.status(400).json({ success: false, message: 'Enter a valid section key, title, and content.' });
    }
    const id = Number(req.params.id);
    if (id) {
      const [result] = await db.execute(
        'UPDATE homepage_contents SET section_key = ?, title = ?, body = ?, image_path = ?, is_published = ?, sort_order = ? WHERE id = ?',
        [sectionKey, title, body, imagePath, published, sortOrder, id]
      );
      if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Homepage section not found.' });
    } else {
      await db.execute(
        'INSERT INTO homepage_contents (section_key, title, body, image_path, is_published, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [sectionKey, title, body, imagePath, published, sortOrder]
      );
    }
    return res.json({ success: true, message: 'Homepage content saved.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'A section with this key already exists. It may be in the Archived list: restore it or use a different key.' });
    next(error);
  }
}

async function saveAnnouncement(req, res, next) {
  try {
    const title = String(req.body.title || '').trim();
    const body = String(req.body.body || '').trim();
    const imagePath = req.body.image_path ? String(req.body.image_path).trim() : null;
    const published = req.body.is_published === false || req.body.is_published === 0 ? 0 : 1;
    const publishedAt = req.body.published_at || null;
    if (!title || title.length > 180 || !body || body.length > 10000) return res.status(400).json({ success: false, message: 'Title and announcement content are required.' });
    const id = Number(req.params.id);
    if (id) {
      const [result] = await db.execute(
        'UPDATE announcements SET title = ?, body = ?, image_path = ?, is_published = ?, published_at = ? WHERE id = ?',
        [title, body, imagePath, published, publishedAt, id]
      );
      if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Announcement not found.' });
    } else {
      await db.execute(
        'INSERT INTO announcements (title, body, image_path, is_published, published_at, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [title, body, imagePath, published, publishedAt, req.user.id]
      );
    }
    return res.json({ success: true, message: 'Announcement saved.' });
  } catch (error) { next(error); }
}

// Soft delete: ang row ay hindi binubura. Nilalagyan lang ng is_archived = 1 para mawala sa public website,
// at puwede itong i-restore ng admin.
function setArchived(table, label, archived) {
  return async (req, res, next) => {
    try {
      const [result] = await db.execute(
        `UPDATE ${table} SET is_archived = ?, archived_at = ${archived ? 'NOW()' : 'NULL'} WHERE id = ?`,
        [archived ? 1 : 0, Number(req.params.id)]
      );
      if (!result.affectedRows) return res.status(404).json({ success: false, message: `${label} not found.` });
      return res.json({ success: true, message: `${label} ${archived ? 'archived' : 'restored'}.` });
    } catch (error) { next(error); }
  };
}

const archiveHomepage = setArchived('homepage_contents', 'Homepage section', true);
const restoreHomepage = setArchived('homepage_contents', 'Homepage section', false);
const archiveAnnouncement = setArchived('announcements', 'Announcement', true);
const restoreAnnouncement = setArchived('announcements', 'Announcement', false);

module.exports = { listPublic, listAdmin, saveHomepage, archiveHomepage, restoreHomepage, saveAnnouncement, archiveAnnouncement, restoreAnnouncement };
