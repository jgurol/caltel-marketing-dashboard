const { getSupabase, setCors, requireAuth, logActivity } = require('./_utils/supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  const supabase = getSupabase();
  const brand = req.query.brand;

  if (req.method === 'GET') {
    let q = supabase.from('icps').select('*').order('created_at', { ascending: false });
    if (brand && brand !== 'all') q = q.eq('brand_id', brand);
    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  }

  if (req.method === 'POST') {
    const { name, tier, active, notes, brand_id } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const { data, error } = await supabase.from('icps').insert({
      name, tier: tier || 'Tier 3 - High Velocity', active: active !== false, notes, brand_id
    }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    await logActivity(supabase, 'icp_created', `Created ICP: ${name}`, brand_id, user.email);
    return res.json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
