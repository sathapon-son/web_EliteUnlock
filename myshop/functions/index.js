const { onRequest } = require("firebase-functions/v2/https");

const REGION = "asia-southeast1";

exports.order = onRequest(
  {
    region: REGION,
    invoker: "public", // อนุญาตให้เรียกจากหน้าเว็บได้โดยไม่ต้อง login
    secrets: ["LINE_CHANNEL_ACCESS_TOKEN", "LINE_TARGET_ID"],
  },
  async (req, res) => {
    try {
      // CORS: allow browser requests. Use the request Origin when present to be less permissive than '*'.
      const origin = req.get("origin") || "*";
      res.set("Access-Control-Allow-Origin", origin);
      res.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type,Authorization");

      // Handle preflight
      if (req.method === "OPTIONS") {
        return res.status(204).send("");
      }

      if (req.method !== "POST") {
        return res.status(405).json({ ok: false, error: "Method Not Allowed" });
      }

      const body = req.body || {};
      const { name, product, qty, total, note, type, email, amount, proofImageUrl } = body;

      if (!process.env.LINE_CHANNEL_ACCESS_TOKEN || !process.env.LINE_TARGET_ID) {
        console.error("Missing LINE secrets");
        return res.status(500).json({ ok: false, error: "Server not configured with LINE secrets" });
      }

      let text;
      
      // Check if this is a credit request
      // Check multiple conditions: explicit type='credit' OR amount field exists OR product field is missing
      if (type === 'credit' || (amount && !product)) {
        const userEmail = email || name || '-';
        const amt = Number(amount) || 0;
        text = [
          "🪙 มีคำขอเติมเครดิตใหม่",
          `👤 ลูกค้า: ${userEmail}`,
          `💰 จำนวน: ${amt.toLocaleString()} เครดิต`,
          `🔗 หลักฐาน: ${proofImageUrl || 'ไม่มี'}`
        ].join('\n');
        console.log('Credit request LINE notification:', { userEmail, amt, proofImageUrl });
      } else {
        // Regular order
        text = [
          "🛒 มีคำสั่งซื้อใหม่",
          `👤 ลูกค้า: ${name || "-"}`,
          `📦 สินค้า: ${product || "-"}`,
          `🔢 จำนวน: ${qty || "-"}`,
          `💰 ยอดรวม: ${total || "-"}`,
          note ? `📝 หมายเหตุ: ${note}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      }

      const payload = {
        to: process.env.LINE_TARGET_ID,
        messages: [{ type: "text", text }],
      };

      const r = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + process.env.LINE_CHANNEL_ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const out = await r.text();
      if (!r.ok) {
        console.error("LINE API Error:", out);
        return res.status(502).json({ ok: false, error: out });
      }

      console.log("✅ LINE message sent successfully");
      return res.json({ ok: true, message: "ส่งแจ้งเตือนเข้า LINE สำเร็จ" });
    } catch (e) {
      console.error("Function Error:", e);
      return res.status(500).json({ ok: false, error: String(e) });
    }
  }
);