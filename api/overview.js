const { getSupabase, setCors, requireAuth } = require('./_utils/supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  const supabase = getSupabase();
  const brand = req.query.brand;

  try {
    const addBrandFilter = (q) => {
      if (brand && brand !== 'all') return q.eq('brand_id', brand);
      return q;
    };

    const [
      { count: totalIcps },
      { count: totalSequences },
      { count: totalContacts },
      { count: exportedContacts },
      { data: recentActivity }
    ] = await Promise.all([
      addBrandFilter(supabase.from('icps').select('*', { count: 'exact', head: true }).eq('active', true)),
      addBrandFilter(supabase.from('email_sequences').select('*', { count: 'exact', head: true })),
      addBrandFilter(supabase.from('contacts').select('*', { count: 'exact', head: true })),
      addBrandFilter(supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('campaign_status', 'exported')),
      supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(5)
    ]);

    return res.json({
      totalIcps: totalIcps || 0,
      totalSequences: totalSequences || 0,
      totalLeads: totalContacts || 0,
      exportedLeads: exportedContacts || 0,
      pipelineValue: (exportedContacts || 0) * 15000,
      recentActivity: recentActivity || []
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
