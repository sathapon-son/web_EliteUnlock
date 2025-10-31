
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";

// ✅ สร้าง __dirname (ESM ไม่มีตัวนี้ ต้องสร้างเอง)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ เริ่ม Express app
const app = express();
app.use(express.json());
app.use(cors({ origin: "*" })); // เปิดให้ทุก origin เข้าถึงได้ (ทดสอบง่าย)

// ✅ เสิร์ฟไฟล์ในโฟลเดอร์เดียวกับ server.js (index.html จะเปิดจาก http://localhost:8080)
app.use(express.static(__dirname));

// ======== ตั้งค่าของคุณที่นี่ ========
const CHANNEL_ACCESS_TOKEN = "zjaM3EsqodaFWcMFiNsXiEGCoBUN01oVXRMUR9TUeM5WJlqlKJ6C+9+7VPor3Pv2u4Lqc/r2l9g0xIrUKa+6oJF+bxz5DyjLJ/Xc9J/yjv4mKc+/iAdAAhUkqHKYLflFo3v0S8EVRJHtsE/nRdN7GgdB04t89/1O/w1cDnyilFU=";
const TARGET_ID = "Uad176011fb5734e50a3b214a1025fd2b"; // userId หรือ groupId ของคุณเอง
// =====================================

// ✅ Route สำหรับรับข้อมูลการสั่งซื้อ
app.post("/order", async (req, res) => {
  try {
    const { name, phone, product, qty, total, note } = req.body;

    const lines = [
      "🛒 มีคำสั่งซื้อใหม่",
      `👤 ลูกค้า: ${name || "-"}`,
      `📦 สินค้า: ${product || "-"}`,
      `🔢 จำนวน: ${qty || "-"}`,
      `💰 ยอดรวม: ${total || "-"}`,
      note ? `📝 หมายเหตุ: ${note}` : ""
    ];

    const text = lines.filter(Boolean).join("\n");

    const payload = {
      to: TARGET_ID,
      messages: [{ type: "text", text }]
    };

    const r = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + CHANNEL_ACCESS_TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const out = await r.text();
    if (!r.ok) {
      console.error("LINE API error:", out);
      return res.status(500).send(out);
    }

    res.json({ ok: true, message: "ส่งแจ้งเตือนเข้า LINE สำเร็จ ✅" });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).send(String(err));
  }
});

// ✅ เริ่มรันเซิร์ฟเวอร์
const PORT = 8080;
app.listen(PORT, () => console.log(`✅ Server started on http://localhost:${PORT}`));
