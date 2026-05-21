// api/confirm-order.js
// Admin xác nhận đơn -> tạo key ngẫu nhiên -> gửi email cho khách

import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── Tạo key ngẫu nhiên dạng XXXX-XXXX-XXXX-XXXX ────────
function genKey() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = () => Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
  return `${seg()}-${seg()}-${seg()}-${seg()}`;
}

// ── Gửi email cho khách ─────────────────────────────────
async function sendKeyEmail({ to, orderId, planName, days, key }) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1);">
    <div style="background:linear-gradient(135deg,#22c55e,#06b6d4);padding:28px 32px;">
      <h1 style="color:#fff;margin:0;font-size:22px;">SNG Shop</h1>
      <p style="color:rgba(255,255,255,.85);margin:6px 0 0;font-size:14px;">Key kích hoạt của bạn đã sẵn sàng!</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#333;font-size:15px;margin-top:0;">Xin chào,</p>
      <p style="color:#333;font-size:15px;">Đơn hàng <strong>${orderId}</strong> đã được xác nhận. Đây là key kích hoạt gói <strong>${planName}</strong> (${days} ngày) của bạn:</p>

      <div style="background:#f0fdf4;border:2px dashed #22c55e;border-radius:10px;padding:20px;text-align:center;margin:24px 0;">
        <p style="margin:0 0 6px;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:.08em;">Key kích hoạt</p>
        <p style="margin:0;font-size:26px;font-weight:700;letter-spacing:3px;color:#16a34a;font-family:monospace;">${key}</p>
      </div>

      <p style="color:#555;font-size:13px;line-height:1.7;">
        <strong>Hướng dẫn kích hoạt:</strong><br>
        1. Mở tool SNG Shop trên máy tính<br>
        2. Vào mục <em>Kích hoạt</em> và nhập key ở trên<br>
        3. Click <em>Xác nhận</em> — tool sẽ hoạt động ngay
      </p>

      <div style="border-top:1px solid #eee;margin-top:24px;padding-top:16px;">
        <p style="color:#888;font-size:12px;margin:0;">Cần hỗ trợ? Liên hệ admin qua
          <a href="https://zalo.me/0825160035" style="color:#06b6d4;text-decoration:none;">Zalo</a>.
        </p>
        <p style="color:#bbb;font-size:11px;margin:6px 0 0;">© SNG Shop — Không chia sẻ key với người khác.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"SNG Shop" <${process.env.GMAIL_USER}>`,
    to,
    subject: `[SNG Shop] Key kích hoạt gói ${planName} — ${orderId}`,
    html,
  });
}

// ── Handler ─────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  // Kiểm tra admin token
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const { order_id } = req.body || {};
  if (!order_id) {
    return res.status(400).json({ ok: false, error: "Thiếu order_id" });
  }

  // Lấy thông tin đơn hàng
  const { data: order, error: fetchErr } = await supabase
    .from("orders")
    .select("*")
    .eq("order_id", order_id)
    .single();

  if (fetchErr || !order) {
    return res.status(404).json({ ok: false, error: "Không tìm thấy đơn hàng" });
  }
  if (order.status === "confirmed") {
    return res.status(400).json({ ok: false, error: "Đơn đã được xác nhận rồi" });
  }

  // Tạo key ngẫu nhiên
  const key = genKey();
  const confirmed_at = new Date().toISOString();

  // Cập nhật Supabase
  const { error: updateErr } = await supabase
    .from("orders")
    .update({ status: "confirmed", key, confirmed_at })
    .eq("order_id", order_id);

  if (updateErr) {
    console.error("Supabase update error:", updateErr);
    return res.status(500).json({ ok: false, error: "Lỗi cập nhật đơn hàng" });
  }

  // Gửi email cho khách
  try {
    await sendKeyEmail({
      to:       order.email,
      orderId:  order.order_id,
      planName: order.plan_name,
      days:     order.days,
      key,
    });
  } catch (mailErr) {
    console.error("Email error:", mailErr);
    // Vẫn trả về OK vì đơn đã confirm, admin tự gửi key thủ công nếu cần
    return res.status(200).json({
      ok: true, key,
      warning: "Đơn đã xác nhận nhưng gửi email thất bại. Gửi key thủ công cho khách.",
    });
  }

  return res.status(200).json({ ok: true, key, message: "Đã gửi key qua email thành công!" });
}
