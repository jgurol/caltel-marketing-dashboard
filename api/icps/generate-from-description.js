const { getSupabase, setCors, requireAuth, logActivity } = require('../_utils/supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = requireAuth(req, res);
  if (!user) return;

  const { description, brand_id, brand_context } = req.body || {};
  if (!description) return res.status(400).json({ error: 'description required' });

  const GOOGLE_AI_KEY = process.env.GOOGLE_AI_KEY;
  if (!GOOGLE_AI_KEY) return res.status(500).json({ error: 'Google AI not configured' });

  try {
    const prompt = `You are a B2B marketing strategist for ${brand_context?.name || 'a telecom/MSP company'}.
Create a detailed ICP (Ideal Customer Profile) based on this description: "${description}"

Return a JSON object with:
- name: short ICP name (e.g. "Tier 1 - Enterprise MSPs")
- tier: one of ["Tier 1 - Strategic", "Tier 2 - Growth", "Tier 3 - High Velocity"]
- notes: detailed profile (300-500 words) covering: target profile, focus areas, sweet spot, deal size, decision timeline, pain points, key decision makers
- active: true`;

    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_AI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );
    const aiData = await aiRes.json();
    const text = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'AI did not return valid JSON' });
    const icpData = JSON.parse(jsonMatch[0]);

    const supabase = getSupabase();
    const { data, error } = await supabase.from('icps').insert({
      name: icpData.name, tier: icpData.tier, active: true, notes: icpData.notes, brand_id
    }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    await logActivity(supabase, 'icp_ai_generated', `AI generated ICP: ${icpData.name}`, brand_id, user.email);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
