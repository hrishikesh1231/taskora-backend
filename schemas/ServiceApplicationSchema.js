


// const mongoose = require("mongoose");
// const { Schema } = mongoose;

// const ServiceApplicationSchema = new Schema(
//   {
//     service: {
//       type: Schema.Types.ObjectId,
//       ref: "Service",
//       required: true,
//     },
//     applicant: {
//       type: Schema.Types.ObjectId,
//       ref: "user", // ✅ FIXED
//       required: true,
//     },
//     name: String,
//     message: String,
//     contact: String,
//     charges: String,
//     pictures: [String],
//   },
//   { timestamps: true }
// );

// module.exports = ServiceApplicationSchema;



const mongoose = require("mongoose");
const { Schema } = mongoose;

const ServiceApplicationSchema = new Schema(
  {
    service: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },

    applicant: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    name: String,
    message: String,
    contact: String,
    charges: String,
    pictures: [String],

    // ✅ ADD THIS
    status: {
      type: String,
      enum: ["pending", "selected", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = ServiceApplicationSchema;