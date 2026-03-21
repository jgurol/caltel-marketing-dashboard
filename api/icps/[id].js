const { getSupabase, setCors, requireAuth, logActivity } = require('../_utils/supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  const { id } = req.query;
  const supabase = getSupabase();

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('icps').select('*').eq('id', id).single();
    if (error || !data) return res.status(404).json({ error: 'ICP not found' });
    return res.json(data);
  }

  if (req.method === 'PUT') {
    const updates = {};
    const allowed = ['name', 'tier', 'active', 'notes', 'brand_id'];
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    const { data, error } = await supabase.from('icps').update(updates).eq('id', id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('icps').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    await logActivity(supabase, 'icp_deleted', `Deleted ICP: ${id}`, null, user.email);
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
