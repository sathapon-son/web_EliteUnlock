const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const REGION = "asia-southeast1";

initializeApp();
const db = getFirestore();

exports.order = onRequest(
  {
    region: REGION,
    invoker: "public", // allow public invoke; app handles auth if needed
    secrets: [
      "LINE_CHANNEL_ACCESS_TOKEN",
      "LINE_TARGET_ID",
      // Optional: store mail to Firestore
      "ADMIN_EMAIL",
      "MAIL_FROM",
    ],
  },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
      }

      const { name, product, qty, total, note } = req.body || {};

      const text = [
        "คำสั่งซื้อใหม่",
        `ชื่อลูกค้า: ${name || "-"}`,
        `สินค้า: ${product || "-"}`,
        `จำนวน: ${qty || "-"}`,
        `ยอดรวม: ${total || "-"}`,
        note ? `หมายเหตุ: ${note}` : "",
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

      // Store email payload to Firestore (mail queue) for admin
      try {
        const adminEmail = process.env.ADMIN_EMAIL;
        const fromEmail = process.env.MAIL_FROM || adminEmail || "noreply@eliteunlock.app";

        if (adminEmail) {
          const mailDoc = {
            to: [adminEmail],
            from: fromEmail,
            replyTo: fromEmail,
            message: {
              subject: "คำสั่งซื้อใหม่",
              text,
              html: text.replace(/\n/g, "<br>")
            },
            metadata: { source: "order-function" },
            createdAt: FieldValue.serverTimestamp(),
          };

          await db.collection("mail").add(mailDoc);
          console.log("🗳️ Stored mail for admin in Firestore");
        } else {
          console.log("🗳️ ADMIN_EMAIL not set; skip storing mail");
        }
      } catch (mailErr) {
        console.error("Store mail failed:", mailErr);
        // Do not fail the request if storing mail fails; LINE already sent
      }

      return res.send("ส่งแจ้งเตือนไปที่ LINE และบันทึกเมลถึงแอดมินสำเร็จ (ถ้าตั้งค่า) ✅");
    } catch (e) {
      console.error("Function Error:", e);
      return res.status(500).send(String(e));
    }
  }
);
