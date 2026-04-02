

const express = require("express");
const router = express.Router();

const { isLoggedIn } = require("../middlewares/middleware");

const { Application } = require("../models/ApplicationModel");
const ServiceApplication = require("../models/ServiceApplicationModel");
const { Gig } = require("../models/Gigmodel");
const { Service } = require("../models/Servicemodel");
const { UserModel } = require("../models/UserModel");

const Notification = require("../models/Notification");
const Contract = require("../models/ContractModel");
const TokenTransaction = require("../models/TokenTransaction");

// ======================================================
// 1️⃣ SELECT APPLICANT + CREATE CONTRACT
// ======================================================

router.post("/contracts/select", isLoggedIn, async (req, res) => {
  try {
    const { applicationId, type } = req.body;

    if (!applicationId || !type) {
      return res.status(400).json({ error: "Missing data" });
    }

    let application, ownerPost, postId;

    if (type === "gig") {
      application = await Application.findById(applicationId);
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }
      ownerPost = await Gig.findById(application.gig);
      postId = application.gig;
    } else if (type === "service") {
      application = await ServiceApplication.findById(applicationId);
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }
      ownerPost = await Service.findById(application.service);
      postId = application.service;
    } else {
      return res.status(400).json({ error: "Invalid type" });
    }

    if (!ownerPost || ownerPost.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const activeContract =
      type === "gig"
        ? await Contract.findOne({
            gig: postId,
            status: { $in: ["recruiter_confirmed", "applicant_confirmed", "both_confirmed"] },
          })
        : await Contract.findOne({
            service: postId,
            status: { $in: ["recruiter_confirmed", "applicant_confirmed", "both_confirmed"] },
          });

    if (activeContract) {
      return res.status(400).json({
        error: "A candidate has already been selected",
      });
    }

    const recruiter = await UserModel.findById(req.user._id);
    const applicantUser = await UserModel.findById(application.applicant);

    if (!recruiter || !applicantUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (recruiter.tokens < 15 || applicantUser.tokens < 5) {
      return res.status(400).json({
        error: "Insufficient tokens for selection",
      });
    }

    application.status = "selected";
    await application.save();

    if (type === "gig") {
      await Gig.findByIdAndUpdate(postId, {
        isActive: false,
        isClosed: true,
      });
    } else {
      await Service.findByIdAndUpdate(postId, {
        isActive: false,
        isClosed: true,
      });
    }

    const contract = await Contract.create({
      gig: type === "gig" ? postId : null,
      service: type === "service" ? postId : null,
      recruiter: req.user._id,
      applicant: application.applicant,
      applicantContact: application.contact,
      recruiterConfirmed: true,
      applicantConfirmed: false,
      status: "recruiter_confirmed",
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
    });

    await Notification.create({
      user: application.applicant,
      title: "Application Selected 🎉",
      message: `You have been selected for a ${type}. Confirm within 12 hours.`,
      type: "CONFIRM",
      link: "/applications",
    });

    res.json({ success: true, contract });
  } catch (err) {
    console.error("CONTRACT SELECT ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ======================================================
// 2️⃣ APPLICANT CONFIRM CONTRACT
// ======================================================
router.post("/contracts/:id/confirm", isLoggedIn, async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({ error: "Contract not found" });
    }

    if (contract.applicant.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    contract.applicantConfirmed = true;
    contract.status = "applicant_confirmed";

    if (contract.recruiterConfirmed && contract.applicantConfirmed) {
      contract.status = "both_confirmed";

      if (!contract.tokensDeducted) {
        const recruiter = await UserModel.findById(contract.recruiter);
        const applicant = await UserModel.findById(contract.applicant);

        const recruiterDeduction = 15;
        const applicantDeduction = 5;

        if (
          recruiter.tokens < recruiterDeduction ||
          applicant.tokens < applicantDeduction
        ) {
          return res.status(400).json({ error: "Insufficient tokens" });
        }

        recruiter.tokens -= recruiterDeduction;
        applicant.tokens -= applicantDeduction;

        await recruiter.save();
        await applicant.save();

        await TokenTransaction.create({
          user: recruiter._id,
          type: "debit",
          amount: recruiterDeduction,
          reason: "Contract Confirmation",
          balanceAfter: recruiter.tokens,
          gig: contract.gig || null,
          service: contract.service || null,
        });

        await TokenTransaction.create({
          user: applicant._id,
          type: "debit",
          amount: applicantDeduction,
          reason: "Contract Confirmation",
          balanceAfter: applicant.tokens,
          gig: contract.gig || null,
          service: contract.service || null,
        });

        contract.tokensDeducted = true;
      }
    }

    await contract.save();

    await Notification.create({
      user: contract.recruiter,
      title: "Contract Confirmed ✅",
      message: "Your contract has been confirmed.",
      type: "CONFIRM",
      link: "/my-posted-tasks",
    });

    res.json({ success: true });
  } catch (err) {
    console.error("❌ CONFIRM ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ======================================================
// 3️⃣ FETCH MY CONTRACTS + CHECK EXPIRY
// ======================================================
router.get("/contracts/my", isLoggedIn, async (req, res) => {
  try {
    const contracts = await Contract.find({
      $or: [{ recruiter: req.user._id }, { applicant: req.user._id }],
    })
      .populate("gig")
      .populate("service")
      .populate("recruiter", "_id username email")
      .populate("applicant", "_id username email")
      .sort({ createdAt: -1 });

    for (let contract of contracts) {
      if (
        contract.gig &&
        contract.status === "recruiter_confirmed" &&
        contract.expiresAt &&
        contract.expiresAt < new Date()
      ) {
        contract.status = "expired";
        await contract.save();

        await Gig.findByIdAndUpdate(contract.gig._id, {
          isClosed: false,
          isActive: true,
        });

        await Application.findOneAndUpdate(
          {
            gig: contract.gig._id,
            applicant: contract.applicant,
          },
          {
            $set: { status: "rejected" },
          }
        );

        await Notification.create({
          user: contract.recruiter._id,
          title: "Contract Expired ⏳",
          message: "Applicant did not confirm within 12 hours.",
          type: "CONTRACT",
          link: `/gig/${contract.gig._id}/applicants`,
        });
      }

      if (
        contract.service &&
        contract.status === "recruiter_confirmed" &&
        contract.expiresAt &&
        contract.expiresAt < new Date()
      ) {
        contract.status = "expired";
        await contract.save();

        await Service.findByIdAndUpdate(contract.service._id, {
          isClosed: false,
          isActive: true,
        });

        await ServiceApplication.findOneAndUpdate(
          {
            service: contract.service._id,
            applicant: contract.applicant,
          },
          {
            $set: { status: "rejected" },
          }
        );

        await Notification.create({
          user: contract.recruiter._id,
          title: "Service Contract Expired ⏳",
          message: "Applicant did not confirm within 12 hours.",
          type: "CONTRACT",
          link: `/service/${contract.service._id}/applicants`,
        });
      }
    }

    const updatedContracts = contracts.map((contract) => ({
      ...contract.toObject(),
      isRecruiter:
        contract.recruiter._id.toString() === req.user._id.toString(),
    }));

    res.json(updatedContracts);
  } catch (err) {
    console.error("FETCH CONTRACT ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ======================================================
// 4️⃣ APPLICANT REJECT CONTRACT
// ======================================================
router.post("/contracts/:id/reject", isLoggedIn, async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({ error: "Contract not found" });
    }

    if (contract.applicant.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not allowed" });
    }

    if (contract.status === "both_confirmed") {
      return res.status(400).json({ error: "Contract already confirmed" });
    }

    contract.status = "rejected";
    await contract.save();

    if (contract.gig) {
      await Gig.findByIdAndUpdate(contract.gig, {
        isClosed: false,
        isActive: true,
      });

      await Application.findOneAndUpdate(
        {
          gig: contract.gig,
          applicant: contract.applicant,
        },
        {
          $set: { status: "rejected" },
        }
      );
    }

    if (contract.service) {
      await Service.findByIdAndUpdate(contract.service, {
        isClosed: false,
        isActive: true,
      });

      await ServiceApplication.findOneAndUpdate(
        {
          service: contract.service,
          applicant: contract.applicant,
        },
        {
          $set: { status: "rejected" },
        }
      );
    }

    await Notification.create({
      user: contract.recruiter,
      title: "Contract Rejected",
      message: `${req.user.username} rejected your contract`,
      type: "CONTRACT",
      link: "/my-posted-tasks",
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Reject contract error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
module.exports = router;