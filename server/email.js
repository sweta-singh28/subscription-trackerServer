require("dotenv").config();
const sgMail = require("@sendgrid/mail");
console.log(process.env.SENDGRID_API_KEY)
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

module.exports = async function sendEmail({ to, subject, text, html }) {
  const msg = {
    to,
    from: process.env.EMAIL_FROM, // must be verified in SendGrid
    subject,
    text,
    html,
  };

  try {
    await sgMail.send(msg);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error(
      "SendGrid error:",
      error.response ? error.response.body : error
    );
  }
};
