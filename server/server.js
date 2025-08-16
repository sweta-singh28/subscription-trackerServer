const express = require("express");
const cron = require("node-cron");
const db = require("./firebase");
const sendEmail = require("./email");

const app = express();
app.get("/", (_, res) => res.send("Server up"));

/** runs 9:00 AM IST daily */
cron.schedule(
  "0 9 * * *",
  async () => {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const in2Start = new Date(dayStart.getTime() + 2 * 24 * 60 * 60 * 1000);
    const in3End = new Date(dayStart.getTime() + 4 * 24 * 60 * 60 * 1000 - 1);

    try {
      const q = await db
        .collection("subscriptions")
        .where("renewalDate", ">=", in2Start)
        .where("renewalDate", "<=", in3End)
        .get();

      const jobs = [];
      q.forEach((doc) => {
        const s = doc.data();
        const when = s.renewalDate.toDate
          ? s.renewalDate.toDate()
          : new Date(s.renewalDate);
        jobs.push(
          sendEmail({
            to: s.userEmail,
            subject: `Reminder: ${s.name} renews on ${when.toDateString()}`,
            text: `Hi! Your ${s.name} renews on ${when.toDateString()}.`,
            html: `<p>Hi! Your <b>${
              s.name
            }</b> renews on <b>${when.toDateString()}</b>.</p>`,
          })
        );
      });
      await Promise.all(jobs);
      console.log(`Reminders sent: ${jobs.length}`);
    } catch (e) {
      console.error("Cron error:", e);
    }
  },
  { timezone: "Asia/Kolkata" }
);

app.listen(5000, () => console.log("Server running on http://localhost:5000"));
