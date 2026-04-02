const axios = require("axios");
const { Gig } = require("../models/Gigmodel");
const { deductTokens } = require("../utils/tokenManager");
const { Application } = require("../models/ApplicationModel");
const FASTAPI_URL = process.env.FASTAPI_URL;

// ================= ADD GIG =================
exports.addGig = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      state,
      district,
      location,
      date,
      contact,
    } = req.body;

    if (
      !title ||
      !description ||
      !category ||
      !state ||
      !district ||
      !date ||
      !contact
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await axios.post(`${FASTAPI_URL}/analyze`, {
      title,
      description,
      location: location || "na",
      category,
      date,
      contact,
    });

    const newGig = new Gig({
      title,
      description,
      category,
      state,
      district,
      location,
      date,
      contact,
      postedBy: req.user._id,
    });

    await newGig.save();

    await deductTokens({
      userId: req.user._id,
      amount: 5,
      reason: "Post Gig",
      gig: newGig._id,
    });

    return res.status(201).json({
      message: "Gig created successfully",
      gig: newGig,
    });
  } catch (err) {
    console.error("ADD GIG ERROR:", err.response?.data || err.message);

    return res.status(400).json({
      error:
        err.response?.data?.message || "Gig rejected by AI or invalid data",
    });
  }
};

// ================= GET SINGLE GIG =================
exports.getGig = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);

    if (!gig)
      return res.status(404).json({ error: "Gig not found" });

    if (gig.postedBy.toString() !== req.user._id.toString())
      return res.status(404).json({ error: "Gig not found" });

    res.json(gig);
  } catch (err) {
    console.error("GET GIG ERROR:", err);
    res.status(500).json({ error: "Failed to fetch gig" });
  }
};

// ================= UPDATE GIG =================
exports.updateGig = async (req, res) => {
  try {
    const aiRes = await axios.post(`${FASTAPI_URL}/analyze`, {
      title: req.body.title,
      description: req.body.description,
      location: req.body.location || "unknown",
      category: req.body.category || "Other",
      date: req.body.date,
      contact: req.body.contact,
    });

    if (aiRes.data.status !== "ok") {
      return res.status(400).json({ error: aiRes.data.message });
    }

    const updatedGig = await Gig.findOneAndUpdate(
      { _id: req.params.id, postedBy: req.user._id },
      req.body,
      { new: true }
    );

    if (!updatedGig)
      return res.status(404).json({
        error: "Gig not found or not authorized",
      });

    res.json({
      message: "Gig updated successfully",
      gig: updatedGig,
    });
  } catch (err) {
    console.error("UPDATE GIG ERROR:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to update gig" });
  }
};

// ================= DELETE GIG =================
exports.deleteGig = async (req, res) => {
  try {
    const deletedGig = await Gig.findOneAndDelete({
      _id: req.params.id,
      postedBy: req.user._id,
    });

    if (!deletedGig)
      return res.status(404).json({
        error: "Gig not found or not authorized ❌",
      });

    res.status(200).json({
      message: "✅ Gig deleted successfully",
    });
  } catch (err) {
    console.error("DELETE GIG ERROR:", err);
    res.status(500).json({
      error: "Server error while deleting gig",
    });
  }
};

// ================= SEARCH BY CITY =================
exports.getGigsByCity = async (req, res) => {
  const city = req.params.city;

  const gigs = await Gig.find({
    isActive: true,
    $or: [
      { location: new RegExp(city, "i") },
      { district: new RegExp(city, "i") },
    ],
  }).populate("postedBy", "username email");

  res.json(gigs);
};

// ================= NEAR ME =================
exports.getNearMe = async (req, res) => {
  const gigs = await Gig.find({
    district: req.user.district,
    isActive: true,
  }).populate("postedBy", "username email");

  res.json(gigs);
};

// ================= CATEGORY =================
exports.getByCategory = async (req, res) => {
  const { category } = req.params;

  const gigs = await Gig.find({
    category: new RegExp(`^${category}$`, "i"),
    isActive: true,
  })
    .populate("postedBy", "username")
    .sort({ createdAt: -1 });

  res.json(gigs);
};

// ================= COUNT =================
exports.countByCity = async (req, res) => {
  const city = req.params.city;

  const count = await Gig.countDocuments({
    $or: [
      { location: { $regex: new RegExp(city, "i") } },
      { district: { $regex: new RegExp(city, "i") } },
    ],
  });

  res.json({ count });
};

// ================= MY GIGS =================
exports.myGigs = async (req, res) => {
  const gigs = await Gig.find({ postedBy: req.user._id })
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json(gigs);
};

// ================= MY GIG APPLICATIONS =================
exports.myApplications = async (req, res) => {
  try {
    const applications = await Application.find({
      applicant: req.user._id,
    })
      .populate({
        path: "gig",
        select: "title location date category district state",
      })
      .sort({ createdAt: -1 })
      .lean(); // ✅ faster, read-only

    res.status(200).json(applications);
  } catch (err) {
    console.error("❌ Error fetching applications:", err);
    res.status(500).json({
      error: "Failed to fetch applications",
    });
  }
};