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
      if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
      }

      const { name, phone, product, qty, total, note } = req.body || {};

      const text = [
        "🛒 มีคำสั่งซื้อใหม่",
        `👤 ลูกค้า: ${name || "-"}`,
        `📞 เบอร์: ${phone || "-"}`,
        `📦 สินค้า: ${product || "-"}`,
        `🔢 จำนวน: ${qty || "-"}`,
        `💰 ยอดรวม: ${total || "-"}`,
        note ? `📝 หมายเหตุ: ${note}` : "",
      ]
        .filter(Boolean)
        .join("\n");

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
        return res.status(500).send(out);
      }

      console.log("✅ LINE message sent successfully");
      return res.send("ส่งแจ้งเตือนเข้า LINE สำเร็จ ✅");
    } catch (e) {
      console.error("Function Error:", e);
      return res.status(500).send(String(e));
    }
  }
);
