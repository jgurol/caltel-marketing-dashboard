const { getSupabase, setCors, requireAuth, logActivity } = require('../_utils/supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = requireAuth(req, res);
  if (!user) return;

  const { sequences, brand_id } = req.body || {};
  if (!sequences?.length) return res.status(400).json({ error: 'sequences array required' });

  const supabase = getSupabase();
  const toInsert = sequences.map(s => ({ ...s, brand_id, status: s.status || 'pending' }));
  const { data, error } = await supabase.from('email_sequences').insert(toInsert).select();
  if (error) return res.status(400).json({ error: error.message });

  await logActivity(supabase, 'sequences_created', `Created ${data.length} sequences`, brand_id, user.email);
  return res.json({ created: data.length, sequences: data });
};
