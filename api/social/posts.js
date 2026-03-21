const { getSupabase, setCors, requireAuth, storageRead, storageWrite } = require('../_utils/supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  const supabase = getSupabase();
  const { brand, status, platform } = req.query;

  if (req.method === 'GET') {
    let posts = await storageRead(supabase, 'social-posts.json') || [];
    if (brand && brand !== 'all') posts = posts.filter(p => p.brand === brand);
    if (status) posts = posts.filter(p => p.status === status);
    if (platform) posts = posts.filter(p => p.platform === platform);
    return res.json(posts.slice(0, 100));
  }

  if (req.method === 'PUT') {
    const { id } = req.query;
    let posts = await storageRead(supabase, 'social-posts.json') || [];
    const idx = posts.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Post not found' });
    posts[idx] = { ...posts[idx], ...req.body };
    await storageWrite(supabase, 'social-posts.json', posts);
    return res.json(posts[idx]);
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
