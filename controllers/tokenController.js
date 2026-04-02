const TokenTransaction = require("../models/TokenTransaction");
const { UserModel } = require("../models/UserModel");

exports.createWelcomeBonus = async (userId) => {
  try {
    const user = await UserModel.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    await TokenTransaction.create({
      user: user._id,
      type: "credit",
      amount: 100,
      reason: "Welcome Bonus",
      balanceAfter: user.tokens,
    });

    return {
      success: true,
      message: "🎉 Welcome to Taskora! You received 100 free tokens to get started.",
      tokens: user.tokens,
    };

  } catch (error) {
    console.error("WELCOME BONUS ERROR:", error);
    throw error;
  }
};