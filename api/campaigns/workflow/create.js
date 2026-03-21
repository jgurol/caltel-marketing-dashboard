const { getSupabase, setCors, requireAuth, storageRead, storageWrite, logActivity } = require('../../_utils/supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = requireAuth(req, res);
  if (!user) return;

  const supabase = getSupabase();
  const workflows = await storageRead(supabase, 'campaign-workflows.json') || [];
  const { icp_id, sequence_id, brand_id, icp_name, sequence_name, ...rest } = req.body || {};

  const workflow = {
    id: crypto.randomUUID(), icp_id, icp_name, sequence_id, sequence_name,
    brand_id, status: 'draft', data: rest, created_at: new Date().toISOString()
  };
  workflows.unshift(workflow);
  await storageWrite(supabase, 'campaign-workflows.json', workflows);
  await logActivity(supabase, 'workflow_created', 'Created workflow for ' + icp_name, brand_id, user.email);
  return res.json(workflow);
};
