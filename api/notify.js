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
    body:  `${email} · ${planLabel}
