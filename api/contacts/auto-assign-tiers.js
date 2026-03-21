const { getSupabase, setCors, requireAuth, logActivity } = require('../_utils/supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = requireAuth(req, res);
  if (!user) return;

  const supabase = getSupabase();
  const { brand } = req.body || {};

  // Get ICPs with notes to match against
  let icpQ = supabase.from('icps').select('*').eq('active', true);
  if (brand && brand !== 'all') icpQ = icpQ.eq('brand_id', brand);
  const { data: icps } = await icpQ;

  // Get contacts without ICP assignment
  let cQ = supabase.from('contacts').select('*').is('icp_id', null);
  if (brand && brand !== 'all') cQ = cQ.eq('brand_id', brand);
  const { data: contacts } = await cQ;

  if (!contacts?.length) return res.json({ assigned: 0, message: 'No unassigned contacts' });
  if (!icps?.length) return res.json({ assigned: 0, message: 'No active ICPs found' });

  // Simple tier auto-assignment: assign to tier based on title keywords
  const tierMap = {
    'Tier 1 - Strategic': ['cto', 'cio', 'vp', 'director', 'chief'],
    'Tier 2 - Growth': ['manager', 'lead', 'senior', 'head'],
    'Tier 3 - High Velocity': []
  };

  let assigned = 0;
  for (const contact of contacts) {
    const titleLower = (contact.title || '').toLowerCase();
    let assignedTier = icps[icps.length - 1]; // default to last ICP

    for (const icp of icps) {
      const tier = icp.tier || '';
      if (tier.includes('Tier 1') && tierMap['Tier 1 - Strategic'].some(k => titleLower.includes(k))) {
        assignedTier = icp;
        break;
      } else if (tier.includes('Tier 2') && tierMap['Tier 2 - Growth'].some(k => titleLower.includes(k))) {
        assignedTier = icp;
        break;
      }
    }

    await supabase.from('contacts').update({ icp_id: assignedTier.id, tier: assignedTier.tier }).eq('id', contact.id);
    assigned++;
  }

  await logActivity(supabase, 'tiers_auto_assigned', `Auto-assigned ${assigned} contacts to ICPs`, brand, user.email);
  return res.json({ assigned });
};
