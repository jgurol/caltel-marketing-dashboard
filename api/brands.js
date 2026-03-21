const { getSupabase, setCors, requireAuth, storageRead, storageWrite, logActivity } = require('./_utils/supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  const supabase = getSupabase();
  const brands = await storageRead(supabase, 'brands.json') || [];

  if (req.method === 'GET') {
    return res.json(brands);
  }

  if (req.method === 'POST') {
    const { name, slug } = req.body || {};
    if (!name || !slug) return res.status(400).json({ error: 'name and slug required' });
    const id = req.body.id || slug.toLowerCase().replace(/[^a-z0-9]/g, '-');
    if (brands.find(b => b.id === id)) return res.status(400).json({ error: 'Brand ID already exists' });
    const brand = { id, name, slug, website: req.body.website, description: req.body.description,
      products: req.body.products, tagline: req.body.tagline, primaryColor: req.body.primaryColor,
      secondaryColor: req.body.secondaryColor, accentColor: req.body.accentColor, logoUrl: req.body.logoUrl,
      active: req.body.active !== false, mission: req.body.mission, values: req.body.values,
      createdAt: new Date().toISOString() };
    brands.push(brand);
    await storageWrite(supabase, 'brands.json', brands);
    await logActivity(supabase, 'brand_created', 'Created brand: ' + name, id, user.email);
    return res.json(brand);
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
