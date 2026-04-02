// // const mongoose = require("mongoose");
// // const { ServiceApplicationSchema } = require("../schemas/ServiceApplicationSchema");

// // const ServiceApplication = mongoose.model("ServiceApplication", ServiceApplicationSchema);
// // module.exports = { ServiceApplication };


// // // models/Servicemodel.js
// // // const mongoose = require("mongoose");
// // // // const { ServiceSchema } = require("../schemas/ServiceSchema");

// // // const Service = mongoose.model("Service", Ser); Servicepll// ✅ Capital S

// // // module.exports = { Service };



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
//       ref: "User",
//       required: true,
//     },
//     name: {
//       type: String,
//       required: true,
//     },
//     message: {
//       type: String,
//       required: true,
//     },
//     contact: {
//       type: String,
//       required: true,
//     },
//     charges: {
//       type: String,
//       required: true,
//     },
//     pictures: [String],
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model(
//   "ServiceApplication",
//   ServiceApplicationSchema
// );


const mongoose = require("mongoose");
const schema = require("../schemas/ServiceApplicationSchema");

module.exports = mongoose.model("ServiceApplication", schema);
