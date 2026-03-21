const { getSupabase, setCors, requireAuth } = require('./_utils/supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  const supabase = getSupabase();
  const [
    { count: contacts }, { count: icps }, { count: sequences }, { count: brands }
  ] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }),
    supabase.from('icps').select('*', { count: 'exact', head: true }),
    supabase.from('email_sequences').select('*', { count: 'exact', head: true }),
    supabase.from('brands').select('*', { count: 'exact', head: true })
  ]);

  return res.json({
    platform: 'vercel',
    version: '2.0.0',
    supabase: { contacts, icps, sequences, brands },
    env: {
      hasGoogleAI: !!process.env.GOOGLE_AI_KEY,
      hasInstantly: !!process.env.INSTANTLY_API_KEY,
      hasBuffer: !!process.env.BUFFER_API_TOKEN,
      hasHunter: !!process.env.HUNTER_API_KEY
    }
  });
};
