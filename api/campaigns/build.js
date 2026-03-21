const { getSupabase, setCors, requireAuth, storageRead, storageWrite, logActivity } = require('../_utils/supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = requireAuth(req, res);
  if (!user) return;

  const { icp_id, sequence_id, contact_ids, campaign_name, brand_id } = req.body || {};
  if (!icp_id || !sequence_id) return res.status(400).json({ error: 'icp_id and sequence_id required' });

  const supabase = getSupabase();

  const [{ data: icp }, { data: seq }] = await Promise.all([
    supabase.from('icps').select('*').eq('id', icp_id).single(),
    supabase.from('email_sequences').select('*').eq('id', sequence_id).single()
  ]);

  let contactQ = supabase.from('contacts').select('*');
  if (contact_ids?.length) contactQ = contactQ.in('id', contact_ids);
  else {
    contactQ = contactQ.eq('icp_id', icp_id).neq('campaign_status', 'exported');
    if (brand_id && brand_id !== 'all') contactQ = contactQ.eq('brand_id', brand_id);
  }
  const { data: contacts } = await contactQ;

  const name = campaign_name || (icp?.name || 'ICP') + ' - ' + (seq?.subject || 'Sequence') + ' - ' + new Date().toISOString().split('T')[0];

  const history = await storageRead(supabase, 'campaign-history.json') || [];
  const record = { id: crypto.randomUUID(), campaign_name: name, icp_name: icp?.name,
    sequence_name: seq?.subject, contact_count: contacts?.length || 0, brand_id,
    data: { icp, sequence: seq, contacts }, created_at: new Date().toISOString() };
  history.unshift(record);
  if (history.length > 200) history.splice(200);
  await storageWrite(supabase, 'campaign-history.json', history);

  if (contacts?.length) {
    await supabase.from('contacts').update({ campaign_status: 'exported' }).in('id', contacts.map(c => c.id));
  }

  await logActivity(supabase, 'campaign_built', 'Built campaign: ' + name + ' (' + (contacts?.length || 0) + ' contacts)', brand_id, user.email);
  return res.json({ success: true, campaign_name: name, contact_count: contacts?.length || 0, contacts, sequence: seq });
};
