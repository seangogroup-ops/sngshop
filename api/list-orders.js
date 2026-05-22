import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = req.headers.authorization || '';
  if (auth !== 'Bearer ' + process.env.ADMIN_TOKEN)
    return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error)
    return res.status(500).json({ ok: false, error: error.message });

  return res.json({ ok: true, orders });
}
