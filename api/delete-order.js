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

  if (req.method !== 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const auth = req.headers.authorization || '';
  if (auth !== 'Bearer ' + process.env.ADMIN_TOKEN)
    return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const { order_id } = req.body;

  // Xoá theo order_id (dù null hay có giá trị)
  let query = supabase.from('orders').delete();
  if (order_id === null || order_id === 'null' || order_id === undefined) {
    query = query.is('order_id', null);
  } else {
    query = query.eq('order_id', order_id);
  }

  const { error } = await query;
  if (error) return res.status(500).json({ ok: false, error: error.message });

  re
