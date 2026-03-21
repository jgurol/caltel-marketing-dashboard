const { getSupabase, setCors, requireAuth, logActivity } = require('../_utils/supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = requireAuth(req, res);
  if (!user) return;

  const { icp_id, brand_id, count = 3, brand_context } = req.body || {};
  if (!icp_id) return res.status(400).json({ error: 'icp_id required' });

  const GOOGLE_AI_KEY = process.env.GOOGLE_AI_KEY;
  if (!GOOGLE_AI_KEY) return res.status(500).json({ error: 'Google AI not configured' });

  const supabase = getSupabase();
  const { data: icp } = await supabase.from('icps').select('*').eq('id', icp_id).single();
  if (!icp) return res.status(404).json({ error: 'ICP not found' });

  try {
    const prompt = `You are an expert B2B email copywriter for ${brand_context?.name || 'a telecom/IT services company'}.

Generate ${count} email sequence subjects and bodies for this ICP:
Name: ${icp.name}
Profile: ${icp.notes || ''}
${brand_context ? `Company: ${brand_context.name} - ${brand_context.description}
Products: ${brand_context.products}` : ''}

Return a JSON array of sequence objects, each with:
- subject: compelling email subject line
- body: personalized email body (150-200 words, professional but conversational)
- step: email number (1, 2, 3, etc.)
- delay_days: days after previous email to send (step 1 = 0)`;

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
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return res.status(500).json({ error: 'AI did not return valid sequences' });

    const sequences = JSON.parse(jsonMatch[0]);
    const toInsert = sequences.map(s => ({
      ...s, icp_id, brand_id, status: 'pending', source: 'ai_generated'
    }));

    const { data, error } = await supabase.from('email_sequences').insert(toInsert).select();
    if (error) return res.status(400).json({ error: error.message });

    await logActivity(supabase, 'sequences_generated', `AI generated ${data.length} sequences for ${icp.name}`, brand_id, user.email);
    return res.json({ generated: data.length, sequences: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
