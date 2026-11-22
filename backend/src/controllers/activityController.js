const db = require('../db');
const { readableAction, categoryOf } = require('../services/activityLog');

const MAX_ROWS = 2000;
const dateOnly = value => (/^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? value : null);

// Activity Log: every recorded action of the signed-in user (admins can also view everyone).
async function list(req, res, next) {
  try {
    const scopeAll = req.query.scope === 'all';
    if (scopeAll && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only administrators can view all activity.' });
    }
    const pageSize = Math.min(Math.max(parseInt(req.query.limit, 10) || 15, 5), 50);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const category = String(req.query.category || '').toLowerCase();
    const search = String(req.query.q || '').trim().toLowerCase();
    const from = dateOnly(req.query.from);
    const to = dateOnly(req.query.to);

    const where = [];
    const params = [];
    if (!scopeAll) { where.push('al.user_id = ?'); params.push(req.user.id); }
    if (from) { where.push('al.created_at >= ?'); params.push(`${from} 00:00:00`); }
    if (to) { where.push('al.created_at <= ?'); params.push(`${to} 23:59:59`); }

    const [rows] = await db.query(
      `SELECT al.id, al.user_id, u.full_name AS actor_name, u.role AS actor_role, al.action, al.created_at
       FROM activity_logs al LEFT JOIN users u ON u.id = al.user_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY al.created_at DESC, al.id DESC LIMIT ${MAX_ROWS}`,
      params
    );

    let items = rows.map(row => {
      const action = readableAction(row.action);
      return { id: row.id, user_id: row.user_id, actor_name: row.actor_name, actor_role: row.actor_role, action, category: categoryOf(action), created_at: row.created_at };
    });
    const counts = items.reduce((acc, item) => { acc[item.category] = (acc[item.category] || 0) + 1; return acc; }, {});
    if (category && category !== 'all') items = items.filter(item => item.category === category);
    if (search) items = items.filter(item => `${item.action} ${item.actor_name || ''} ${item.actor_role || ''}`.toLowerCase().includes(search));

    const total = items.length;
    const pages = Math.max(Math.ceil(total / pageSize), 1);
    const safePage = Math.min(page, pages);
    return res.json({
      success: true,
      data: items.slice((safePage - 1) * pageSize, safePage * pageSize),
      total, page: safePage, pages, page_size: pageSize, counts
    });
  } catch (error) { next(error); }
}

module.exports = { list };
