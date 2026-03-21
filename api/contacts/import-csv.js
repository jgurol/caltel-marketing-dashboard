const { getSupabase, setCors, requireAuth, logActivity } = require('../_utils/supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = requireAuth(req, res);
  if (!user) return;

  const { csvData, icp_id, brand_id, tier } = req.body || {};
  if (!csvData) return res.status(400).json({ error: 'csvData required' });

  try {
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, '_'));
    const contacts = [];

    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row = {};
      headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });

      const email = row.email || row.email_address || '';
      const name = row.name || row.full_name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || '';
      if (!email || !name) continue;

      contacts.push({
        name, email,
        title: row.title || row.job_title || '',
        company: row.company || row.organization || '',
        phone: row.phone || row.phone_number || '',
        linkedin_url: row.linkedin || row.linkedin_url || '',
        tier: tier || row.tier || '',
        icp_id, brand_id
      });
    }

    if (!contacts.length) return res.status(400).json({ error: 'No valid contacts found in CSV' });

    const supabase = getSupabase();
    const { data, error } = await supabase.from('contacts').upsert(contacts, { onConflict: 'email' }).select();
    if (error) return res.status(400).json({ error: error.message });

    await logActivity(supabase, 'contacts_imported', `Imported ${data?.length || 0} contacts`, brand_id, user.email);
    return res.json({ imported: data?.length || 0, total: contacts.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
