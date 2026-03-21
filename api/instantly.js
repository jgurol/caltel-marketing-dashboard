const { setCors, requireAuth } = require('./_utils/supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  // Handle /api/instantly/status
  const INSTANTLY_KEY = process.env.INSTANTLY_API_KEY;
  if (!INSTANTLY_KEY) return res.json({ connected: false, message: 'Instantly not configured' });

  try {
    const r = await fetch('https://api.instantly.ai/api/v1/campaign/list?limit=1&skip=0', {
      headers: { 'Authorization': `Bearer ${INSTANTLY_KEY}` }
    });
    const data = await r.json();
    return res.json({ connected: r.ok, campaigns: data?.total || 0 });
  } catch {
    return res.json({ connected: false, message: 'Could not reach Instantly API' });
  }
};
