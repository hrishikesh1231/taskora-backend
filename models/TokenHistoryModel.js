const mongoose = require("mongoose");
const { TokenHistorySchema } = require("../schemas/TokenHistorySchema");

const TokenHistoryModel = mongoose.model(
  "TokenHistory",
  TokenHistorySchema
);

module.exports = TokenHistoryModel;
