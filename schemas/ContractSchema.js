const mongoose = require("mongoose");
const { Schema } = require("mongoose");

const contractSchema = new Schema(
  {
    gig: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gig",
      required: null,
    },
    // 🔹 NEW: Service contract support
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      default: null,
    },

    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    
    applicantContact: {
      type: String,
      required: true
    },

    recruiterConfirmed: {
      type: Boolean,
      default: false,
    },

    applicantConfirmed: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: [
        "recruiter_confirmed",
        "applicant_confirmed",
        "both_confirmed",
// <<<<<<< HEAD
        "rejected",
        "expired", // ✅ NEW
        "cancelled",
        "rejected"
      ],
      default: "pending",
// =======
//            // ✅ ADD THIS
//       ],
//       default: "recruiter_confirmed"
// >>>>>>> origin/feature-work-100
    },

    tokensDeducted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = { contractSchema };
