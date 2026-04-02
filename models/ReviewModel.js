const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  contract: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Contract",
    required: true,
  },

  gig: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Gig",
    required: true,
  },

  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },

  reviewedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },

  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },

  comment: {
    type: String,
  }

}, { timestamps: true });

module.exports = mongoose.model("Review", reviewSchema);