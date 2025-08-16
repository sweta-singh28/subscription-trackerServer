require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

module.exports = async function sendEmail({ to, subject, text, html }) {
  await transporter.sendMail({
    from: `"Subscription Tracker" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
};
