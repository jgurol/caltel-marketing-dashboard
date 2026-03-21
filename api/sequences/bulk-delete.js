const { getSupabase, setCors, requireAuth } = require('../_utils/supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = requireAuth(req, res);
  if (!user) return;

  const { ids } = req.body || {};
  if (!ids?.length) return res.status(400).json({ error: 'ids required' });

  const supabase = getSupabase();
  const { error } = await supabase.from('email_sequences').delete().in('id', ids);
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ deleted: ids.length });
};
