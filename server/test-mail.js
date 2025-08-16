const sendEmail = require("./email");
sendEmail({
  to: process.env.EMAIL_USER,
  subject: "SMTP test",
  text: "If you got this, your App Password works!",
})
  .then(() => console.log("Sent"))
  .catch(console.error);
