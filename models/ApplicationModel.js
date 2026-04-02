const mongoose = require("mongoose");
const { ApplicationSchema } = require("../schemas/ApplicationSchema");

const Application = mongoose.model("Application", ApplicationSchema);
module.exports = { Application };
