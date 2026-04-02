// <<<<<<< HEAD
// const {model} = require('mongoose');

// const mongoose = require("mongoose");
// const { UserSchema } = require('../schemas/UserSchema');

// const UserModel = mongoose.model("user", UserSchema);

// module.exports = { UserModel };


const mongoose = require("mongoose");
const { UserSchema } = require("../schemas/UserSchema");

// ✅ SAFE VERSION (NO DUPLICATE MODEL)
const UserModel =
  mongoose.models.user || mongoose.model("user", UserSchema);

module.exports = { UserModel };
