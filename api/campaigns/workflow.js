const { getSupabase, setCors, requireAuth, storageRead, storageWrite, logActivity } = require('../_utils/supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  const supabase = getSupabase();
  const workflows = await storageRead(supabase, 'campaign-workflows.json') || [];
  const brand = req.query.brand;

  if (req.method === 'GET') {
    const filtered = (brand && brand !== 'all') ? workflows.filter(w => w.brand_id === brand) : workflows;
    return res.json(filtered);
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
