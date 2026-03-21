const { getSupabase, setCors, requireAuth, storageRead, storageWrite, logActivity } = require('../_utils/supabase');

const BUFFER_CHANNELS = {
  caltel: { linkedin: '65b4063d54860730347a56c0', instagram: '65b4220c54860730347020eb', facebook: '65b4221b5486073034708ef6' },
  netverge: { linkedin: '69b88e237be9f8b171629304' }
};

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = requireAuth(req, res);
  if (!user) return;

  const { post_id } = req.body || {};
  const BUFFER_TOKEN = process.env.BUFFER_API_TOKEN;
  if (!BUFFER_TOKEN) return res.status(500).json({ error: 'Buffer not configured' });

  const supabase = getSupabase();
  const posts = await storageRead(supabase, 'social-posts.json') || [];
  const idx = posts.findIndex(p => p.id === post_id);
  if (idx === -1) return res.status(404).json({ error: 'Post not found' });
  const post = posts[idx];

  const channelId = BUFFER_CHANNELS[post.brand]?.[post.platform];
  if (!channelId) return res.status(400).json({ error: 'No Buffer channel for ' + post.brand + '/' + post.platform });

  try {
    const bufferRes = await fetch('https://api.bufferapp.com/1/updates/create.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ access_token: BUFFER_TOKEN, profile_ids: channelId, text: post.content }).toString()
    });
    const bufferData = await bufferRes.json();
    if (!bufferData.success && bufferData.code !== 1000) {
      return res.status(400).json({ error: bufferData.message || 'Buffer publish failed' });
    }

    posts[idx] = { ...post, status: 'published', published_at: new Date().toISOString(), buffer_id: bufferData.updates?.[0]?.id };
    await storageWrite(supabase, 'social-posts.json', posts);
    await logActivity(supabase, 'social_published', 'Published ' + post.platform + ' post', post.brand, user.email);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
