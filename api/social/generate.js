const { getSupabase, setCors, requireAuth, storageRead, storageWrite, logActivity } = require('../_utils/supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = requireAuth(req, res);
  if (!user) return;

  const { brand_id, platforms = ['linkedin', 'instagram', 'facebook'], topic, brand_context } = req.body || {};
  const GOOGLE_AI_KEY = process.env.GOOGLE_AI_KEY;
  if (!GOOGLE_AI_KEY) return res.status(500).json({ error: 'Google AI not configured' });

  try {
    const prompt = 'You are a social media manager for ' + (brand_context?.name || 'a technology company') + '.\n' +
      (brand_context ? 'Company: ' + brand_context.description + '\nProducts: ' + brand_context.products + '\n' : '') +
      (topic ? 'Topic: ' + topic : "Create engaging content about the company's services") + '\n\n' +
      'Generate social media posts for: ' + platforms.join(', ') + '\n\n' +
      'Return a JSON array where each object has:\n- platform: the platform name\n- content: the post text\n- hashtags: array of 5-8 relevant hashtags';

    const aiRes = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GOOGLE_AI_KEY,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
    );
    const aiData = await aiRes.json();
    const text = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return res.status(500).json({ error: 'AI did not return valid posts' });
    const generated = JSON.parse(jsonMatch[0]);

    const supabase = getSupabase();
    const existing = await storageRead(supabase, 'social-posts.json') || [];
    const newPosts = generated.map(p => ({
      id: crypto.randomUUID(), brand: brand_id, platform: p.platform,
      content: p.content + (p.hashtags?.length ? '\n\n' + p.hashtags.map(h => '#' + h.replace(/^#/, '')).join(' ') : ''),
      status: 'pending', data: { topic, brand_context }, created_at: new Date().toISOString()
    }));
    const allPosts = [...newPosts, ...existing];
    if (allPosts.length > 500) allPosts.splice(500);
    await storageWrite(supabase, 'social-posts.json', allPosts);

    await logActivity(supabase, 'social_generated', 'Generated ' + newPosts.length + ' social posts', brand_id, user.email);
    return res.json({ generated: newPosts.length, posts: newPosts });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
