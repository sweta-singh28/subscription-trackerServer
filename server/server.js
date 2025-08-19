const express = require("express");
const cron = require("node-cron");
const db = require("./firebase");
const sendEmail = require("./email");
require("dotenv").config();

const app = express();

// Health-check route
app.get("/", (_, res) => res.send("Server up"));

/**
 * Helper → compute next due date (monthly only)
 */
function getNextDueDate(baseDate, fromDate = new Date()) {
  const d = new Date(baseDate);

  // Use same day every month
  const next = new Date(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    d.getDate()
  );

  // if already passed this month → go to next month
  if (next < fromDate) {
    next.setMonth(next.getMonth() + 1);
  }

  return next;
}

/**
 * Cron reminder job
 */
async function runReminderJob() {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const in2Start = new Date(dayStart.getTime() + 2 * 24 * 60 * 60 * 1000);
  const in3End = new Date(dayStart.getTime() + 4 * 24 * 60 * 60 * 1000 - 1);

  try {
    const subs = await db.collection("subscriptions").get();
    const jobs = [];

    for (const doc of subs.docs) {
      const s = doc.data();
      const recurrence = s.recurrence || "monthly"; // ✅ default monthly
      if (recurrence !== "monthly") continue; // safety, future-proof

      const baseDate = s.renewDate.toDate
        ? s.renewDate.toDate()
        : new Date(s.renewDate);

      // calculate next due date dynamically (monthly)
      const nextDue = getNextDueDate(baseDate, now);

      if (nextDue >= in2Start && nextDue <= in3End) {
        const userRef = await db.collection("users").doc(s.userId).get();
        if (!userRef.exists) continue;
        const userData = userRef.data();

        jobs.push(
          sendEmail({
            to: userData.email,
            subject: `Reminder: ${s.name} renews on ${nextDue.toDateString()}`,
            text: `Hi! Your ${s.name} renews on ${nextDue.toDateString()}.`,
            html: `<p>Hi! Your <b>${
              s.name
            }</b> renews on <b>${nextDue.toDateString()}</b>.</p>`,
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
 * Schedule cron job → runs daily at 9:00 AM IST
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

app.listen(5000, () =>
  console.log("🚀 Server running on http://localhost:5000")
);
