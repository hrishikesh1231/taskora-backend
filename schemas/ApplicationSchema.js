// const mongoose = require("mongoose");
// const { Schema } = mongoose;

// const ApplicationSchema = new Schema({
//   gig: { type: mongoose.Schema.Types.ObjectId, ref: "Gig", required: true },
//   applicant: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
//   name: { type: String, required: true },
//   message: { type: String, required: true },
//   contact: { type: String, required: true },
//   charges: { type: String, required: true },
//   pictures: [String],
//   createdAt: { type: Date, default: Date.now },
// });

// module.exports = { ApplicationSchema };


const mongoose = require("mongoose");
const { Schema } = mongoose;

const ApplicationSchema = new Schema({
  gig: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Gig",
    required: true,
  },

  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },

  name: { type: String, required: true },
  message: { type: String, required: true },
  contact: { type: String, required: true },
  charges: { type: String, required: true },
  pictures: [String],

  // 🔥 ADD THIS
  status: {
    type: String,
    enum: ["pending", "selected", "rejected"],
    default: "pending",
  },

  createdAt: { type: Date, default: Date.now },
});

module.exports = { ApplicationSchema };