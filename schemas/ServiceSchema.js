

// const mongoose = require("mongoose");
// const { Schema } = mongoose;

// const ServiceSchema = new Schema({
//   title: {
//     type: String,
//     required: true,
//   },

//   description: {
//     type: String,
//     required: true,
//   },

//   salary: {
//     type: String,
//     required: true, // e.g. ₹9,500/month
//   },

//   state: {
//     type: String,
//     required: true, // e.g. Maharashtra
//   },

//   district: {
//     type: String,
//     required: true, // 🔥 MAIN FILTER FIELD
//     index: true,
//   },

//   location: {
//     type: String, // area / locality
//   },

//   date: {
//     type: Date,
//     required: true,
//   },

//   contact: {
//     type: String,
//     required: true,
//   },

//   postedBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "user",
//   },

//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
//   isActive: {
//     type: Boolean,
//     default: true,
//   },
// });

// module.exports = { ServiceSchema };


const mongoose = require("mongoose");
const { Schema } = mongoose;

const ServiceSchema = new Schema({
  title: {
    type: String,
    required: true,
  },

  description: {
    type: String,
    required: true,
  },

  salary: {
    type: String,
    required: true,
  },

  state: {
    type: String,
    required: true,
  },

  district: {
    type: String,
    required: true,
    index: true,
  },

  taluka: {
    type: String,
    required: true,
    index: true, // 🔥 helps faster search
  },

  location: {
    type: String, // area/locality
  },

  // 📍 Exact GPS location
  // geoLocation: {
  //   type: {
  //     type: String,
  //     enum: ["Point"],
  //     default: "Point",
  //   },
  //   coordinates: {
  //     type: [Number], // [longitude, latitude]
  //   },
  // },

  date: {
    type: Date,
    required: true,
  },

  contact: {
    type: String,
    required: true,
  },

  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  isActive: {
    type: Boolean,
    default: true,
  },
});

ServiceSchema.index({ geoLocation: "2dsphere" });

module.exports = { ServiceSchema };
