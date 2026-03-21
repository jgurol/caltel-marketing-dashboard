const { setCors, requireAuth } = require('./_utils/supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  return res.json({ status: 'ok', platform: 'vercel', timestamp: new Date().toISOString() });
};
