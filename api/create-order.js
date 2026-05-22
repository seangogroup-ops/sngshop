import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BANK = {
  bank:    "VietinBank",
  bankId:  "ICB",
  account: "109887159091",
  name:    "HUYNH NHAT TAN HAI",
};

const PLANS = {
  basic:    { name: "Basic",    days: 1,  price: 29000  },
  standard: { name: "Standard", days: 3,  price: 59000  },
  pro:      { name: "Pro",      days: 7,  price: 99000  },
  vip:      { name: "VIP",      days: 30, price: 299000 },
};

function genOrderId() {
  const ts   = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SNG-${ts}-${rand}`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const { email, plan } = req.body || {};
  if (!email || !email.includes("@")) return res.status(400).json({ ok: false, error: "Email không hợp lệ!" });

  const planInfo = PLANS[plan];
  if (!planInfo) return res.status(400).json({ ok: false, error: "Gói không hợp lệ!" });

  const orderId = genOrderId();
  const content = `SNG ${orderId}`;

  const { error } = await supabase.from("orders").insert({
    order_id:   orderId,
    email:      email.toLowerCase().trim(),
    plan,
    plan_name:  planInfo.name,
    amount:     planInfo.price,
    days:       planInfo.days,
    status:     "pending",
    content,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Supabase insert error:", error);
    return res.status(500).json({ ok: false, error: "Lỗi lưu đơn hàng!" });
  }

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
    });
    await transporter.sendMail({
      from: `"SNG Shop" <${process.env.GMAIL_USER}>`,
      to:   process.env.GMAIL_USER,
      subject: `[SNG Shop] Don moi: ${orderId} - ${planInfo.name} - ${planInfo.price.toLocaleString("vi-VN")}d`,
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;">
        <h2 style="color:#22c55e;">Don hang moi!</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px;color:#666;">Ma don</td><td style="padding:8px;font-weight:700;">${orderId}</td></tr>
          <tr style="background:#f9f9f9;"><td style="padding:8px;color:#666;">Goi</td><td style="padding:8px;">${planInfo.name} (${planInfo.days} ngay)</td></tr>
          <tr><td style="padding:8px;color:#666;">So tien</td><td style="padding:8px;color:#16a34a;font-weight:700;">${planInfo.price.toLocaleString("vi-VN")}d</td></tr>
          <tr style="background:#f9f9f9;"><td style="padding:8px;color:#666;">Email khach</td><td style="padding:8px;">${email}</td></tr>
          <tr><td style="padding:8px;color:#666;">Noi dung CK</td><td style="padding:8px;font-weight:700;color:#f59e0b;">${content}</td></tr>
        </table>
      </div>`,
    });
  } catch (mailErr) {
    console.error("Admin notify email error:", mailErr);
  }

  return res.status(200).json({
    ok: true, orderId, amount: planInfo.price, content,
    planName: planInfo.name, days: planInfo.days, bank: BANK,
  });
}
