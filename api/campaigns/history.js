const { getSupabase, setCors, requireAuth, storageRead, storageWrite } = require('../_utils/supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  const supabase = getSupabase();
  const history = await storageRead(supabase, 'campaign-history.json') || [];
  const brand = req.query.brand;

  if (req.method === 'GET') {
    const filtered = (brand && brand !== 'all') ? history.filter(h => h.brand_id === brand) : history;
    return res.json(filtered.slice(0, 100));
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    const idx = history.findIndex(h => h.id === id);
    if (idx !== -1) {
      history.splice(idx, 1);
      await storageWrite(supabase, 'campaign-history.json', history);
    }
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
