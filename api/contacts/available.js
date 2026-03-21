const { getSupabase, setCors, requireAuth } = require('../_utils/supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  const supabase = getSupabase();
  const { icp_id, brand } = req.query;

  let q = supabase.from('contacts').select('id,name,email,title,company,tier')
    .neq('campaign_status', 'exported').order('name');
  if (icp_id) q = q.eq('icp_id', icp_id);
  if (brand && brand !== 'all') q = q.eq('brand_id', brand);

  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
};
