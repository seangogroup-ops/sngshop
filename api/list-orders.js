import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  const token = (req.headers["authorization"] || "").replace("Bearer ", "").trim();
  if (token !== process.env.ADMIN_TOKEN) return res.status(401).json({ ok: false, error: "Unauthorized" });

  const { data, error } = await supabase
    .from("orders").select("*").order("created_at", { ascending: false }).limit(200);

  if (error) return res.status(500).json({ ok: false, error: "Loi lay du lieu" });

  return res.status(200).json({ ok: true, orders: data });
}
