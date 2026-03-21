const { setCors, requireAuth } = require('../_utils/supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = requireAuth(req, res);
  if (!user) return;

  let { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'url required' });
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  try {
    const GOOGLE_AI_KEY = process.env.GOOGLE_AI_KEY;
    if (!GOOGLE_AI_KEY) return res.status(500).json({ error: 'Google AI not configured' });

    // Fetch the website
    const pageRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) });
    const html = await pageRes.text();

    // Strip tags for AI analysis
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 5000);

    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_AI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Analyze this website content and extract: company name, description (2-3 sentences), products/services (comma-separated), tagline, mission statement, and values. Return JSON with keys: name, description, products, tagline, mission, values.\n\nWebsite: ${url}\n\nContent:\n${text}` }] }]
        })
      }
    );
    const aiData = await aiRes.json();
    const aiText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return res.json({ success: true, ...parsed });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
