const bcrypt = require('bcryptjs');
const { getSupabase, setCors, requireAuth, storageRead, storageWrite } = require('../_utils/supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;
  if (user.role !== 'admin') return res.status(403).json({ error: 'Admin required' });

  const supabase = getSupabase();
  const users = await storageRead(supabase, 'users.json') || [];

  if (req.method === 'GET') {
    return res.json(users.map(({ password_hash, ...u }) => u));
  }

  if (req.method === 'POST') {
    const { email, password, name, role } = req.body || {};
    if (!email || !password || !name) return res.status(400).json({ error: 'email, password, name required' });
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ error: 'User already exists' });
    }
    const hash = await bcrypt.hash(password, 10);
    const newUser = { id: crypto.randomUUID(), email: email.toLowerCase(), name, role: role || 'viewer', password_hash: hash, created_at: new Date().toISOString() };
    users.push(newUser);
    await storageWrite(supabase, 'users.json', users);
    const { password_hash, ...safeUser } = newUser;
    return res.json(safeUser);
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
