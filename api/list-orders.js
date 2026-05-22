import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

webpush.setVapidDetails(
  'mailto:seangogroup@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export async function sendOrderNotification({ order_id, plan_name, plan, email, amount }) {
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('subscription');

  if (!subs || !subs.length) return;

  const planLabel = plan_name || plan || '?';
  const amountStr = (amount || 0).toLocaleString('vi-VN');

  const payload = JSON.stringify({
    title: '🛒 Đơn hàng mới!',
    body:  `${email} · ${planLabel} · ${amountStr}đ`,
    data:  { order_id },
  });

  await Promise.allSettled(
    subs.map(row => {
      let sub;
      try {
        sub = typeof row.subscription === 'string'
          ? JSON.parse(row.subscription)
          : row.subscription;
      } catch { return Promise.resolve(); }
      return webpush.sendNotification(sub, payload).catch(() => {});
    })
  );
}

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

  const { title, body, data } = req.body || {};
  if (!title) return res.status(400).json({ ok: false, error: 'Thiếu title' });

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('subscription');

  if (!subs || !subs.length)
    return res.json({ ok: true, sent: 0, message: 'Không có subscriber' });

  const payload = JSON.stringify({ title, body: body || '', data: data || {} });

  const results = await Promise.allSettled(
    subs.map(row => {
      let sub;
      try {
        sub = typeof row.subscription === 'string'
          ? JSON.parse(row.subscription)
          : row.subscription;
      } catch { return Promise.resolve(); }
      return webpush.sendNotification(sub, payload);
    })
  );

  const sent = results.filter(r => r.status === 'fulfilled').length;
  return res.json({ ok: true, sent, total: subs.length });
}
