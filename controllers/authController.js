const passport = require("passport");
const crypto = require("crypto");

const Otp = require("../models/OtpModel");
const { UserModel } = require("../models/UserModel");
const { createWelcomeBonus } = require("./tokenController");

// If transporter is created in index.js,
// better move it to utils/email.js later.
// For now we require it like this:
const transporter = require("../utils/transporter"); // create this file if needed

// ================= SEND OTP =================
exports.sendOtp = async (req, res) => {
  try {
    const { email, name } = req.body || {};

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: "Email and Username required",
      });
    }

    // 🔍 Check if username already exists
    const existingUsername = await UserModel.findOne({ username: name });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: "Username already taken",
        field: "name",
      });
    }
    // 🔍 Check if email already exists
    const existingEmail = await UserModel.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
        field: "email",
      });
    }


    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("Generated OTP:", otp);

    await Otp.deleteMany({ email });

    await Otp.create({
      email,
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await transporter.sendMail({
      from: `"TaskOra" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is ${otp}. Valid for 5 minutes.`,
    });

    res.json({ success: true, message: "OTP sent" });
  } catch (err) {
    console.error("❌ SEND OTP ERROR:", err);
    res.status(500).json({ success: false });
  }
};





// ================= VERIFY OTP =================
exports.verifyOtp = async (req, res) => {
  try {
    const { name, email, password, otp, state, district } = req.body || {};

    if (!name || !email || !password || !otp || !state || !district) {
      return res.status(400).json({
        success: false,
        message: "All fields required",
      });
    }

    const existingEmail = await UserModel.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    const otpRecord = await Otp.findOne({ email });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "OTP not found",
      });
    }

    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    if (String(otpRecord.otp) !== String(otp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    const username = name.trim().toLowerCase();

    const existingUser = await UserModel.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Username already taken",
      });
    }

    const newUser = new UserModel({
      username,
      email,
      state,
      district,
    });

    await UserModel.register(newUser, password);

    // Welcome bonus
    await createWelcomeBonus(newUser._id);

    await Otp.deleteOne({ email });

    res.json({
      success: true,
      message: "🎉 Account created successfully!",
      username,
      tokens: 100,
    });
  } catch (err) {
    console.error("❌ VERIFY OTP ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

// ================= LOGIN =================
exports.login = (req, res, next) => {
  passport.authenticate("local", (err, user) => {
    if (err) return next(err);

    if (!user) {
      return res.status(401).json({
        msg: "Invalid username or password",
      });
    }

    req.login(user, (err) => {
      if (err) return next(err);

      res.json({
        user: {
          username: user.username,
          email: user.email,
          state: user.state,
          district: user.district,
          tokens: user.tokens,
        },
      });
    });
  })(req, res, next);
};

// ================= CURRENT USER =================
exports.currentUser = (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ success: false });
  }

  res.json({
    success: true,
    user: {
      _id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      state: req.user.state,
      district: req.user.district,
      tokens: req.user.tokens,
    },
  });
};

// ================= LOGOUT =================
exports.logout = (req, res) => {
  req.logout(() => {
    req.session.destroy();
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
};

// ================= FORGOT PASSWORD =================
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await UserModel.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

    await user.save();

    const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;

    await transporter.sendMail({
      from: `"TaskOra Support" <${process.env.EMAIL_USER}>`,
      to: normalizedEmail,
      subject: "Password Reset Request",
      html: `
        <h2>Password Reset</h2>
        <p>You requested to reset your password.</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link expires in 15 minutes.</p>
      `,
    });

    res.json({
      success: true,
      message: "Reset link sent to your email",
    });
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ================= RESET PASSWORD =================
exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body;

    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await UserModel.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired token",
      });
    }

    await user.setPassword(password);

    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};