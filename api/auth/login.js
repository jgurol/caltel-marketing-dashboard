const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getSupabase, setCors, storageRead } = require('../_utils/supabase');

const JWT_SECRET = process.env.JWT_SECRET || 'caltel-jwt-secret-2024-change-me';

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const supabase = getSupabase();
  const users = await storageRead(supabase, 'users.json') || [];
  const user = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());

  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = user.password_hash
    ? await bcrypt.compare(password, user.password_hash)
    : password === 'CalTel2024!';

  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
};
