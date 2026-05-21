// api/create-order.js
// Vercel Serverless Function — tạo đơn hàng, lưu Supabase

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── Thông tin bank cố định ──────────────────────────────
const BANK = {
  bank:    "VietinBank",
  bankId:  "ICB",          // mã VietQR cho VietinBank
  account: "109887159091",
  name:    "HUYNH NHAT TAN HAI",
};

// ── Bảng giá ───────────────────────────────────────────
const PLANS = {
  basic:    { name: "Basic",    days: 1,  price: 29000  },
  standard: { name: "Standard", days: 3,  price: 59000  },
  pro:      { name: "Pro",      days: 7,  price: 99000  },
  vip:      { name: "VIP",      days: 30, price: 299000 },
};

// ── Generate order ID ──────────────────────────────────
function genOrderId() {
  const ts   = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SNG-${ts}-${rand}`;
}

// ── Handler ────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { email, plan } = req.body || {};

  // Validate
  if (!email || !email.includes("@")) {
    return res.status(400).json({ ok: false, error: "Email không hợp lệ!" });
  }
  const planInfo = PLANS[plan];
  if (!planInfo) {
    return res.status(400).json({ ok: false, error: "Gói không hợp lệ!" });
  }

  const orderId = genOrderId();
  const content = `SNG ${orderId}`;   // nội dung chuyển khoản

  // Lưu vào Supabase
  const { error } = await supabase.from("don_hang").insert({
    order_id:   orderId,
    email:      email.toLowerCase().trim(),
    plan:       plan,
    plan_name:  planInfo.name,
    amount:     planInfo.price,
    days:       planInfo.days,
    status:     "pending",           // chờ admin xác nhận
    content:    content,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Supabase insert error:", error);
    return res.status(500).json({ ok: false, error: "Lỗi lưu đơn hàng!" });
  }

  // Gửi email thông báo cho admin
  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
    });

    const confirmUrl = `https://sng-shop.vercel.app/admin`;
    await transporter.sendMail({
      from: `"SNG Shop" <${process.env.GMAIL_USER}>`,
      to:   process.env.GMAIL_USER,
      subject: `[SNG Shop] Đơn mới: ${orderId} - ${planInfo.name} - ${planInfo.price.toLocaleString("vi-VN")}đ`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;">
          <h2 style="color:#22c55e;">🛒 Đơn hàng mới!</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px;color:#666;">Mã đơn</td><td style="padding:8px;font-weight:700;">${orderId}</td></tr>
            <tr style="background:#f9f9f9;"><td style="padding:8px;color:#666;">Gói</td><td style="padding:8px;">${planInfo.name} (${planInfo.days} ngày)</td></tr>
            <tr><td style="padding:8px;color:#666;">Số tiền</td><td style="padding:8px;color:#16a34a;font-weight:700;">${planInfo.price.toLocaleString("vi-VN")}đ</td></tr>
            <tr style="background:#f9f9f9;"><td style="padding:8px;color:#666;">Email khách</td><td style="padding:8px;">${email}</td></tr>
            <tr><td style="padding:8px;color:#666;">Nội dung CK</td><td style="padding:8px;font-weight:700;color:#f59e0b;">${content}</td></tr>
          </table>
          <div style="margin-top:20px;text-align:center;">
            <a href="${confirmUrl}" style="background:#22c55e;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">
              Vào trang Admin xác nhận
            </a>
          </div>
        </div>
      `,
    });
  } catch (mailErr) {
    console.error("Admin notify email error:", mailErr);
    // Không fail đơn hàng nếu email lỗi
  }

  // Trả về cho frontend
  return res.status(200).json({
    ok:       true,
    orderId,
    amount:   planInfo.price,
    content,
    planName: planInfo.name,
    days:     planInfo.days,
    bank:     BANK,
  });
}
