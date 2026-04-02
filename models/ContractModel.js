const mongoose = require('mongoose');
const { contractSchema } = require('../schemas/ContractSchema');


module.exports = mongoose.model("Contract", contractSchema);
