const cron = require("node-cron");
const mongoose = require("mongoose");
const { Gig } = require("../models/Gigmodel");
// const Gig = mongoose.model("Gig"); // or require your model

// Runs daily at 12:00 AM
cron.schedule("0 0 * * *", async () => {
  console.log("Running expired gig cleanup...");

  try {
    const now = new Date();

    // subtract 1 day
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 1);

    const result = await Gig.deleteMany({
      date: { $lt: cutoffDate },
    });

    console.log(`Deleted ${result.deletedCount} expired gigs`);
  } catch (err) {
    console.error("Cleanup error:", err);
  }
});