const { getSupabase, setCors, requireAuth, logActivity } = require('./_utils/supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  const supabase = getSupabase();
  const { brand, icp_id, tier, campaign_status, limit = 500, offset = 0 } = req.query;

  if (req.method === 'GET') {
    let q = supabase.from('contacts').select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);
    if (brand && brand !== 'all') q = q.eq('brand_id', brand);
    if (icp_id) q = q.eq('icp_id', icp_id);
    if (tier) q = q.eq('tier', tier);
    if (campaign_status) q = q.eq('campaign_status', campaign_status);
    const { data, count, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ contacts: data || [], total: count || 0 });
  }

  if (req.method === 'POST') {
    const { name, email, title, company, tier, notes, icp_id, brand_id, linkedin_url, phone } = req.body || {};
    if (!name || !email) return res.status(400).json({ error: 'name and email required' });
    const { data, error } = await supabase.from('contacts').insert({
      name, email, title, company, tier, notes, icp_id, brand_id, linkedin_url, phone
    }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    await logActivity(supabase, 'contact_created', `Added contact: ${name}`, brand_id, user.email);
    return res.json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
