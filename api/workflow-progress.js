const { getSupabase, setCors, requireAuth } = require('./_utils/supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  const supabase = getSupabase();
  const brand = req.query.brand;

  const addBrandFilter = (q) => {
    if (brand && brand !== 'all') return q.eq('brand_id', brand);
    return q;
  };

  const { data: icps } = await addBrandFilter(supabase.from('icps').select('id,name,tier').eq('active', true));

  const progress = await Promise.all((icps || []).map(async icp => {
    const [{ count: seqCount }, { count: contactCount }, { count: exportedCount }] = await Promise.all([
      supabase.from('email_sequences').select('*', { count: 'exact', head: true }).eq('icp_id', icp.id),
      supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('icp_id', icp.id),
      supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('icp_id', icp.id).eq('campaign_status', 'exported')
    ]);
    return { ...icp, sequences: seqCount || 0, contacts: contactCount || 0, exported: exportedCount || 0 };
  }));

  return res.json(progress);
};
