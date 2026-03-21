const { getSupabase, setCors, requireAuth } = require('./_utils/supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  const supabase = getSupabase();
  const brand = req.query.brand;
  const addBrandFilter = (q) => (brand && brand !== 'all') ? q.eq('brand_id', brand) : q;

  const { data: icps } = await addBrandFilter(supabase.from('icps').select('id,name,tier').eq('active', true));

  const breakdown = await Promise.all((icps || []).map(async icp => {
    const { count: total } = await supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('icp_id', icp.id);
    const { count: exported } = await supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('icp_id', icp.id).eq('campaign_status', 'exported');
    return { icp: icp.name, tier: icp.tier, total: total || 0, exported: exported || 0, available: (total || 0) - (exported || 0) };
  }));

  return res.json(breakdown);
};
