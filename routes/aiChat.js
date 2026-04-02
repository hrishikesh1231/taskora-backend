const express = require("express");
const { Gig } = require("../models/Gigmodel");
const { Service } = require("../models/Servicemodel");
const { askAI } = require("../utils/openaiService");
const { UserModel } = require("../models/UserModel");
// const User = require("../models/User"); // ✅ added
const router = express.Router();

router.post("/chat", async (req, res) => {

  try {

    const { messages } = req.body;

    const aiReply = await askAI(messages);

    let parsed;

    try {
      parsed = JSON.parse(aiReply);
    } catch {
      return res.json({ reply: aiReply });
    }

    // Check last user message for confirmation
    const lastUserMessage =
      messages[messages.length - 1]?.content?.toLowerCase() || "";

    const confirmWords = ["yes", "ok", "post", "confirm", "haa", "ho", "yes post"];

    const confirmed = confirmWords.some(word =>
      lastUserMessage.includes(word)
    );

    // If not confirmed → show preview
    if (!confirmed) {

      return res.json({
        reply: "Here is your task preview. Should I post it?",
        preview: parsed
      });

    }

    // ✅ CHECK TOKENS BEFORE POST
    const user = await UserModel.findById(req.user._id);

    if (!user || user.tokens < 5) {
      return res.json({
        reply: "❌ You don't have enough tokens to post this task."
      });
    }

    // Save Gig
    if (parsed.type === "gig") {

      const newGig = await Gig.create({
        title: parsed.title,
        description: parsed.description,
        state: parsed.state,
        district: parsed.district,
        taluka: parsed.taluka, // ✅ added
        location: parsed.location,
        category: parsed.category,
        date: parsed.date,
        contact: parsed.contact,
        postedBy: req.user._id,
      });

      // ✅ DEDUCT TOKENS AFTER SUCCESS
      user.tokens -= 5;
      await user.save();

      return res.json({
        reply: "✅ Your gig has been posted successfully!",
        post: newGig
      });

    }

    // Save Service
    if (parsed.type === "service") {

      const newService = await Service.create({
        title: parsed.title,
        description: parsed.description,
        salary: parsed.salary,
        state: parsed.state,
        district: parsed.district,
        taluka: parsed.taluka, // ✅ added
        location: parsed.location,
        date: parsed.date,
        contact: parsed.contact,
        postedBy:  req.user._id, 

      });

      // ✅ DEDUCT TOKENS AFTER SUCCESS
      user.tokens -= 5;
      await user.save();

      return res.json({
        reply: "✅ Your service job has been posted successfully!",
        post: newService
      });

    }

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "AI processing failed" });

  }

});

module.exports = router;