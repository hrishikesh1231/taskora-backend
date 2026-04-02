// const mongoose = require('mongoose');

// const { ServiceSchema } = require('../schemas/ServiceSchema');

// const Service = mongoose.model('service',ServiceSchema);

// module.exports={Service}


const mongoose = require("mongoose");
const { ServiceSchema } = require("../schemas/ServiceSchema");

// ✅ Capital S — must match ref: "Service"
const Service = mongoose.model("Service", ServiceSchema);

module.exports = { Service };
