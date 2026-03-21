const { getSupabase, setCors, requireAuth, storageRead } = require('./_utils/supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  const supabase = getSupabase();
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const brand = req.query.brand;

  let log = await storageRead(supabase, 'activity-log.json') || [];
  if (brand && brand !== 'all') log = log.filter(e => e.brand === brand);
  return res.json(log.slice(0, limit));
};
