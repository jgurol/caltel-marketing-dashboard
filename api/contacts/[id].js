const { getSupabase, setCors, requireAuth } = require('../_utils/supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  const { id } = req.query;
  const supabase = getSupabase();

  if (req.method === 'PUT') {
    const allowed = ['name', 'email', 'title', 'company', 'tier', 'notes', 'icp_id', 'brand_id', 'linkedin_url', 'phone', 'campaign_status'];
    const updates = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    const { data, error } = await supabase.from('contacts').update(updates).eq('id', id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
