const express = require("express");
const cron = require("node-cron");
const db = require("./firebase");
const sendEmail = require("./email");
require("dotenv").config;
const { Timestamp } = require("firebase-admin/firestore");
const app = express();

// Health-check route
app.get("/", (_, res) => res.send("Server up"));

/**
 * Function that performs the reminder job
 */
async function runReminderJob() {
  const now = new Date();

  try {
    const subs = await db.collection("subscriptions").get();
    const jobs = [];

    for (const doc of subs.docs) {
      const s = doc.data();
      if (!s.renewDate) continue; // skip if missing

      // Convert Firestore Timestamp -> JS Date
      const renewDate = s.renewDate.toDate();

      // Reminder should be 2 days before renewDate
      const reminderDate = new Date(renewDate);
      reminderDate.setDate(reminderDate.getDate() - 2);

      // Check if today matches the reminder date
      if (
        now.getFullYear() === reminderDate.getFullYear() &&
        now.getMonth() === reminderDate.getMonth() &&
        now.getDate() === reminderDate.getDate()
      ) {
        const userRef = await db.collection("users").doc(s.userId).get();
        if (!userRef.exists) continue;

        const userEmail = userRef.data().email;

        jobs.push(
          sendEmail({
            to: userEmail,
            subject: `Reminder: ${
              s.name
            } renews on ${renewDate.toDateString()}`,
            text: `Hi! Your ${s.name} renews on ${renewDate.toDateString()}.`,
            html: `<p>Hi! Your <b>${
              s.name
            }</b> renews on <b>${renewDate.toDateString()}</b>.</p>`,
          })
        );
      }
    }

    await Promise.all(jobs);
    console.log(`Reminders sent: ${jobs.length}`);
  } catch (e) {
    console.error("Cron error:", e);
  }
}


/**
 * Schedule cron job
 * Runs daily at 9:00 AM IST
 */
cron.schedule("0 9 * * *", runReminderJob, { timezone: "Asia/Kolkata" });

/**
 * Manual trigger for testing
 */
app.get("/test-cron", async (_, res) => {
  try {
    await runReminderJob();
    res.send("Cron job executed manually!");
  } catch (e) {
    res.status(500).send("Error: " + e.message);
  }
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));
