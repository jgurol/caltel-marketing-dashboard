const { getSupabase, setCors, requireAuth, storageRead, storageWrite, logActivity } = require('../_utils/supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  const { id } = req.query;
  const supabase = getSupabase();
  const brands = await storageRead(supabase, 'brands.json') || [];
  const idx = brands.findIndex(b => b.id === id);

  if (req.method === 'GET') {
    if (idx === -1) return res.status(404).json({ error: 'Brand not found' });
    return res.json(brands[idx]);
  }

  if (req.method === 'PUT') {
    if (idx === -1) return res.status(404).json({ error: 'Brand not found' });
    brands[idx] = { ...brands[idx], ...req.body, id };
    await storageWrite(supabase, 'brands.json', brands);
    await logActivity(supabase, 'brand_updated', 'Updated brand: ' + brands[idx].name, id, user.email);
    return res.json(brands[idx]);
  }

  if (req.method === 'DELETE') {
    if (idx === -1) return res.status(404).json({ error: 'Brand not found' });
    brands.splice(idx, 1);
    await storageWrite(supabase, 'brands.json', brands);
    await logActivity(supabase, 'brand_deleted', 'Deleted brand: ' + id, id, user.email);
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
