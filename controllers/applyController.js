const { Gig } = require("../models/Gigmodel");
const { Application } = require("../models/ApplicationModel");
const { UserModel } = require("../models/UserModel");
const Notification = require("../models/Notification");
const sendEmail = require("../utils/sendEmail");
const { deductTokens } = require("../utils/tokenManager");
const TokenTransaction = require("../models/TokenTransaction");
const ServiceApplication = require("../models/ServiceApplicationModel");
const { Service } = require("../models/Servicemodel");

// ================= APPLY GIG =================
exports.applyGig = async (req, res) => {
  let application;

  try {
    // ================= EXISTING LOGIC (NOT CHANGED) =================
    application = new Application({
      gig: req.params.gigId,
      applicant: req.user._id,
      ...req.body,
      pictures: (req.files || []).map((f) => f.path),
    });

    await application.save();

    // ================= TOKEN DEDUCTION =================
    await deductTokens({
      userId: req.user._id,
      amount: 2,
      reason: "Apply Gig",
      gig: req.params.gigId,
    });

    await TokenTransaction.findOneAndUpdate(
      {
        user: req.user._id,
        reason: "Apply Gig",
      },
      {
        $set: { gig: req.params.gigId },
      },
      { sort: { createdAt: -1 } }
    );

    ////////////////////////////

    // ================= STEP 3: NOTIFICATION + EMAIL =================
    try {
      const gig = await Gig.findById(req.params.gigId);

      if (gig) {
        const owner = await UserModel.findById(gig.postedBy);

        if (owner) {
          await Notification.create({
            user: owner._id,
            title: "New Application",
            message: `${req.user.username} applied to your gig`,
            type: "APPLY",
            link: `/gig/${gig._id}/applicants`,
          });

          await sendEmail({
            to: owner.email,
            subject: "New Application Received",
            html: `
              <h2>New Application</h2>
              <p><b>${req.user.username}</b> has applied to your gig.</p>
            `,
          });
        }
      }
    } catch (err) {
      console.error("STEP 3 notification/email error:", err.message);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ APPLY GIG ERROR:", err.message);

    // 🔥 IMPORTANT: CLEANUP IF TOKEN FAILED
    if (application && application._id) {
      await Application.findByIdAndDelete(application._id);
    }

    return res.status(400).json({
      error: err.message || "Insufficient tokens to apply",
    });
  }
};


// ================= APPLY SERVICE =================
exports.applyService = async (req, res) => {
  try {
    console.log("🔥 APPLY SERVICE ROUTE HIT");

    const application = await ServiceApplication.create({
      service: req.params.serviceId,
      applicant: req.user._id,
      name: req.body.name,
      message: req.body.message,
      contact: req.body.contact,
      charges: req.body.charges,
      pictures: (req.files || []).map((f) => f.path),
    });

    console.log("✅ Service application saved");

    /**
     * 🔥 TOKEN DEDUCTION (SAFE POINT)
     */
    await deductTokens({
      userId: req.user._id,
      amount: 1, // 🔧 apply service cost
      reason: "Apply Service",
    });

    // 1️⃣ Fetch service
    const service = await Service.findById(req.params.serviceId);
    if (!service) return res.json({ success: true });

    // 2️⃣ Fetch owner
    const owner = await UserModel.findById(service.postedBy);
    if (!owner) return res.json({ success: true });

    // 3️⃣ Notification
    await Notification.create({
      user: owner._id,
      title: "New Service Application",
      message: `${req.user.username} applied to your service`,
      type: "APPLY",
      link: `/service/${service._id}/applicants`,
    });

    console.log("🔔 Service notification created");

    // 4️⃣ Email
    await sendEmail({
      to: owner.email,
      subject: "New Service Application",
      html: `
        <h3>New Service Application</h3>
        <p><b>${req.user.username}</b> applied to your service.</p>
      `,
    });

    console.log("📧 Service email sent");

    res.json({ success: true });
  } catch (err) {
    console.error("❌ APPLY SERVICE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};