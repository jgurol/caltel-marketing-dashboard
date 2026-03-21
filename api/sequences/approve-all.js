const { getSupabase, setCors, requireAuth } = require('../_utils/supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = requireAuth(req, res);
  if (!user) return;

  const supabase = getSupabase();
  const { brand } = req.body || {};
  let q = supabase.from('email_sequences').update({ status: 'approved' }).eq('status', 'pending');
  if (brand && brand !== 'all') q = q.eq('brand_id', brand);
  const { error } = await q;
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ success: true });
};
