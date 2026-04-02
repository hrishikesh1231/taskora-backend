// const express = require("express");
// const router = express.Router();
// const { isLoggedIn } = require("../middlewares/middleware");
// const Notification = require("../models/Notification");

// // 🔔 Get notifications
// router.get("/notifications", isLoggedIn, async (req, res) => {
//   try {
//     const notifications = await Notification.find({
//       user: req.user._id,
//     }).sort({ createdAt: -1 });

//     res.json(notifications);
//   } catch (err) {
//     res.status(500).json({ error: "Failed to load notifications" });
//   }
// });

// // 🔕 Mark one as read
// router.post("/notifications/:id/read", isLoggedIn, async (req, res) => {
//   try {
//     await Notification.findByIdAndUpdate(req.params.id, {
//       isRead: true,
//     });
//     res.json({ success: true });
//   } catch (err) {
//     res.status(500).json({ error: "Failed to mark as read" });
//   }
// });

// // 🔕 Mark all as read
// router.post("/notifications/read-all", isLoggedIn, async (req, res) => {
//   try {
//     await Notification.updateMany(
//       { user: req.user._id, isRead: false },
//       { isRead: true }
//     );
//     res.json({ success: true });
//   } catch (err) {
//     res.status(500).json({ error: "Failed to mark all as read" });
//   }
// });

// module.exports = router;




const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middlewares/middleware");
const Notification = require("../models/Notification");

// 🔔 Get notifications
router.get("/notifications", isLoggedIn, async (req, res) => {
  try {
    const notifications = await Notification.find({
      user: req.user._id,
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: "Failed to load notifications" });
  }
});

// 🔕 Mark one as read
router.post("/notifications/:id/read", isLoggedIn, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, {
      isRead: true,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark as read" });
  }
});

// 🔕 Mark all as read
router.post("/notifications/read-all", isLoggedIn, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark all as read" });
  }
});

// 🗑 Delete one
router.delete("/notifications/:id", isLoggedIn, async (req, res) => {
  try {
    await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

// 🗑 Delete all
router.delete("/notifications", isLoggedIn, async (req, res) => {
  try {
    await Notification.deleteMany({
      user: req.user._id,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete all notifications" });
  }
});

module.exports = router;