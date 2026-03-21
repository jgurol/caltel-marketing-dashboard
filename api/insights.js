const { getSupabase, setCors, requireAuth } = require('./_utils/supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  const supabase = getSupabase();
  const brand = req.query.brand;
  const insights = [];

  const addBrandFilter = (q) => {
    if (brand && brand !== 'all') return q.eq('brand_id', brand);
    return q;
  };

  const { count: pendingSeq } = await addBrandFilter(
    supabase.from('email_sequences').select('*', { count: 'exact', head: true }).eq('status', 'pending')
  );
  if (pendingSeq > 0) {
    insights.push({ type: 'warning', message: `${pendingSeq} email sequence${pendingSeq > 1 ? 's' : ''} pending approval` });
  }

  const { count: unassigned } = await addBrandFilter(
    supabase.from('contacts').select('*', { count: 'exact', head: true }).is('icp_id', null)
  );
  if (unassigned > 0) {
    insights.push({ type: 'info', message: `${unassigned} contact${unassigned > 1 ? 's' : ''} not assigned to an ICP` });
  }

  const { count: approvedSeq } = await addBrandFilter(
    supabase.from('email_sequences').select('*', { count: 'exact', head: true }).eq('status', 'approved')
  );
  if (approvedSeq > 0) {
    const { count: availableContacts } = await addBrandFilter(
      supabase.from('contacts').select('*', { count: 'exact', head: true }).neq('campaign_status', 'exported')
    );
    if (availableContacts > 0) {
      insights.push({ type: 'success', message: `${approvedSeq} approved sequence${approvedSeq > 1 ? 's' : ''} ready — ${availableContacts} contacts available for campaign` });
    }
  }

  return res.json(insights);
};
