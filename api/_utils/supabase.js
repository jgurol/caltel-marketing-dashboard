const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ljavlghesknxcpftygqr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'caltel-jwt-secret-2024-change-me';

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

function verifyToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.slice(7), JWT_SECRET);
  } catch {
    return null;
  }
}

function requireAuth(req, res) {
  const user = verifyToken(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }
  return user;
}

// Storage-based JSON store (replaces filesystem)
async function storageRead(supabase, filename) {
  const { data, error } = await supabase.storage.from('app-data').download(filename);
  if (error || !data) return null;
  const text = await data.text();
  try { return JSON.parse(text); } catch { return null; }
}

async function storageWrite(supabase, filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const { error } = await supabase.storage.from('app-data').upload(filename, blob, {
    upsert: true, contentType: 'application/json'
  });
  return !error;
}

async function logActivity(supabase, action, details, brand, userEmail) {
  try {
    // Store activity in storage-based log
    const existing = await storageRead(supabase, 'activity-log.json') || [];
    const entry = { id: crypto.randomUUID(), action, details, brand, user_email: userEmail, created_at: new Date().toISOString() };
    existing.unshift(entry);
    if (existing.length > 500) existing.splice(500);
    await storageWrite(supabase, 'activity-log.json', existing);
  } catch {}
}

module.exports = { getSupabase, setCors, verifyToken, requireAuth, storageRead, storageWrite, logActivity };
