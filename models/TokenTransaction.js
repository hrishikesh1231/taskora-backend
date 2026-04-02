

const mongoose = require("mongoose");

const tokenTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },

    // Optional references
    gig: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gig",
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "TokenTransaction",
  tokenTransactionSchema
);

