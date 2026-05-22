import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = req.headers.authorization || '';
  if (auth !== 'Bearer ' + process.env.ADMIN_TOKEN)
    return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const { subscription } = req.body;
  if (!subscription) return res.status(400).json({ ok: false, error: 'Thiếu subscription' });

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ endpoint: subscription.endpoint, subscription: JSON.stringify(subscription) }, { onConflict: 'endpoint' });
