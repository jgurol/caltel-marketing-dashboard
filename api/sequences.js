const { getSupabase, setCors, requireAuth, logActivity } = require('./_utils/supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  const supabase = getSupabase();
  const { brand, icp_id, status } = req.query;

  if (req.method === 'GET') {
    let q = supabase.from('email_sequences').select('*').order('created_at', { ascending: false });
    if (brand && brand !== 'all') q = q.eq('brand_id', brand);
    if (icp_id) q = q.eq('icp_id', icp_id);
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const { data, error } = await supabase.from('email_sequences').insert({
      ...body,
      status: body.status || 'pending'
    }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    await logActivity(supabase, 'sequence_created', `Created sequence: ${data.subject || data.name}`, body.brand_id, user.email);
    return res.json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
