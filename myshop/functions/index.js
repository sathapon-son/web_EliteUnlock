const { onRequest } = require("firebase-functions/v2/https");
const nodemailer = require("nodemailer");

const REGION = "asia-southeast1";

exports.order = onRequest(
  {
    region: REGION,
    invoker: "public", // allow public invoke; app handles auth if needed
    secrets: [
      "LINE_CHANNEL_ACCESS_TOKEN",
      "LINE_TARGET_ID",
      // Optional email settings
      "ADMIN_EMAIL",
      "SMTP_HOST",
      "SMTP_PORT",
      "SMTP_SECURE",
      "SMTP_USER",
      "SMTP_PASS",
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

      // Send the same message to admin email (optional, best-effort)
      try {
        const adminEmail = process.env.ADMIN_EMAIL;
        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = Number(process.env.SMTP_PORT || 587);
        const smtpSecure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || smtpPort === 465;
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        const mailFrom = process.env.MAIL_FROM || smtpUser || adminEmail;

        if (adminEmail && smtpHost && mailFrom) {
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpSecure,
            auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
          });

          await transporter.sendMail({
            from: mailFrom,
            to: adminEmail,
            subject: "คำสั่งซื้อใหม่",
            text,
          });

          console.log("📧 Admin email sent successfully");
        } else {
          console.log("📧 Email not configured. Skipping (set ADMIN_EMAIL/SMTP_*)");
        }
      } catch (mailErr) {
        console.error("Email send failed:", mailErr);
        // Do not fail the request if email fails; LINE already sent
      }

      return res.send("ส่งแจ้งเตือนไปที่ LINE และ Email (ถ้าตั้งค่า) สำเร็จ ✅");
    } catch (e) {
      console.error("Function Error:", e);
      return res.status(500).send(String(e));
    }
  }
);

