const express = require("express");
const router = express.Router();
const Review = require("../models/ReviewModel");
const Contract = require("../models/ContractModel");
const { UserModel } = require("../models/UserModel");
const { isLoggedIn } = require("../middlewares/middleware");

router.post("/", isLoggedIn, async (req, res) => {
  try {
    const { contractId, rating, comment } = req.body;

    const contract = await Contract.findById(contractId)
      .populate("gig");

    if (!contract) {
      return res.status(404).json({ error: "Contract not found" });
    }

    // 🔥 Prevent duplicate review
    const existingReview = await Review.findOne({
      contract: contractId,
      reviewer: req.user._id,
    });

    if (existingReview) {
      return res.status(400).json({
        error: "You already rated this contract",
      });
    }

    // Determine who is being reviewed
    const isRecruiter = contract.recruiter.toString() === req.user._id.toString();

    const reviewedUserId = isRecruiter
      ? contract.applicant
      : contract.recruiter;

    const newReview = new Review({
      contract: contractId,
      gig: contract.gig._id,
      reviewer: req.user._id,
      reviewedUser: reviewedUserId,
      rating,
      comment,
    });

    await newReview.save();

    // 🔥 Update user average rating
    const user = await UserModel.findById(reviewedUserId);

    const newTotal = user.totalReviews + 1;
    const newAvg =
      (user.averageRating * user.totalReviews + rating) / newTotal;

    user.totalReviews = newTotal;
    user.averageRating = newAvg;

    await user.save();

    res.json({ success: true });

  } catch (err) {
    console.error("REVIEW ERROR:", err);
    res.status(500).json({ error: "Failed to submit review" });
  }
});

module.exports = router;