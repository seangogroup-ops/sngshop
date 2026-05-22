import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Bắt buộc phải có để Vercel parse req.body
export const config = {
  api: { bodyParser: true }
};

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

  // Parse body thủ công nếu vẫn là string (fallback)
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const { id } = body || {};
  if (!id) return res.status(400).json({ ok: false, error: 'Thiếu id' });

  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) return res.status(500).json({ ok: false, error: error.message });

  return res.json({ ok: true });
}
