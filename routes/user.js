const express = require("express");
const router = express.Router();
const User = require("../models/user");
const { isLoggedIn } = require("../middleware");

// GET PROFILE
router.get("/me", isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-hash -salt");

    res.json({
      success: true,
      user,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error fetching profile",
    });
  }
});

// UPDATE PROFILE
router.put("/update-profile", isLoggedIn, async (req, res) => {
  try {
    const { username, email, state, district } = req.body;

    if (!username || !email || !state || !district) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // Email check
    const emailExists = await User.findOne({
      email,
      _id: { $ne: req.user._id },
    });

    if (emailExists) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    // Username check
    const usernameExists = await User.findOne({
      username,
      _id: { $ne: req.user._id },
    });

    if (usernameExists) {
      return res.status(400).json({
        message: "Username already exists",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { username, email, state, district },
      { new: true }
    ).select("-hash -salt");

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error",
    });
  }
});

module.exports = router;