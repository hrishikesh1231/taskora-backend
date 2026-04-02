const axios = require("axios");
const { Service } = require("../models/Servicemodel");
const { deductTokens } = require("../utils/tokenManager");


const ServiceApplication = require("../models/ServiceApplicationModel");

const FASTAPI_URL = process.env.FASTAPI_URL;

// ================= ADD SERVICE =================
exports.addService = async (req, res) => {
  try {
    const {
      title,
      description,
      salary,
      state,
      district,
      location,
      date,
      contact,
    } = req.body;

    /**
     * 0️⃣ Hard backend validation (baseline safety)
     */
    if (
      !title ||
      !description ||
      salary === undefined ||
      !state ||
      !district ||
      !date ||
      !contact
    ) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    /**
     * 1️⃣ AI CHECK (✅ SERVICE MODERATION)
     */
    try {
      console.log("Calling AI moderation for SERVICE...");

      await axios.post(`${process.env.FASTAPI_URL}/analyze_service`, {
        title,
        description,
        salary,
        location: location || "na",
        date,
        contact,
      });

      console.log("✅ AI moderation passed");
    } catch (aiError) {
      console.warn("❌ AI moderation failed:");
      console.warn("Message:", aiError.message);
      console.warn("Status:", aiError.response?.status);
      console.warn("Response:", aiError.response?.data);

      return res.status(400).json({
        error:
          aiError.response?.data?.message ||
          "Service rejected by AI moderation",
      });
    }

    /**
     * 2️⃣ SAVE SERVICE (Baseline logic)
     */
    const newService = new Service({
      title,
      description,
      salary,
      state,
      district,
      location,
      date,
      contact,
      postedBy: req.user._id,
    });

    await newService.save();

    /**
     * 3️⃣ TOKEN DEDUCTION
     */
    await deductTokens({
      userId: req.user._id,
      amount: 3,
      reason: "Post Service",
    });

    return res.status(201).json({
      message: "Service created successfully",
      service: newService,
    });
  } catch (err) {
    console.error("🔥 ADD SERVICE ERROR:");
    console.error("Message:", err.message);
    console.error("Status:", err.response?.status);
    console.error("Response:", err.response?.data);

    return res.status(500).json({
      error: "Internal server error while creating service",
    });
  }
};


// ================= GET SERVICE =================
exports.getService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    // 🔒 owner-only
    if (service.postedBy.toString() !== req.user._id.toString()) {
      return res.status(404).json({ error: "Service not found" });
    }

    res.json(service);
  } catch (err) {
    console.error("❌ GET SERVICE ERROR:", err);
    res.status(500).json({ error: "Failed to fetch service" });
  }
};


// ================= UPDATE SERVICE =================
exports.updateService = async (req, res) => {
  try {
    // 🔥 SEND FULL ServiceData SHAPE (MANDATORY)
    const aiRes = await axios.post(`${FASTAPI_URL}/analyze`, {
      title: req.body.title,
      description: req.body.description,
      location: req.body.location || "unknown",
      category: req.body.category || "Other",
      date: req.body.date,
      contact: req.body.contact,
    });

    if (aiRes.data.status !== "ok") {
      return res.status(400).json({
        error: aiRes.data.message,
      });
    }

    const updatedService = await Service.findOneAndUpdate(
      { _id: req.params.id, postedBy: req.user._id },
      req.body,
      { new: true },
    );

    if (!updatedService) {
      return res.status(404).json({
        error: "Service not found or not authorized",
      });
    }

    res.json({
      message: "Service updated successfully",
      service: updatedService,
    });
  } catch (err) {
    console.error(
      "❌ UPDATE SERVICE ERROR:",
      err.response?.data || err.message,
    );

    if (err.response?.data?.message) {
      return res.status(400).json({
        error: err.response.data.message,
      });
    }

    res.status(500).json({ error: "Failed to update service" });
  }
};


// ================= MY SERVICE APPLICATIONS =================
exports.myServiceApplications = async (req, res) => {
  try {
    const apps = await ServiceApplication.find({
      applicant: req.user._id,
    })
      .populate("service") // get service details
      .sort({ createdAt: -1 });

    res.json(apps);
  } catch (err) {
    console.error("❌ ERROR FETCHING SERVICE APPLICATIONS:", err);
    res.status(500).json({
      error: "Failed to fetch service applications",
    });
  }
};


// ================= COUNT SERVICES BY DISTRICT =================
exports.countServicesByDistrict = async (req, res) => {
  try {
    const { district } = req.params;

    const count = await Service.countDocuments({
      district: { $regex: new RegExp(`^${district}$`, "i") },
    });

    res.json({ count });
  } catch (err) {
    res.status(500).json({ count: 0 });
  }
};


// ================= MY SERVICES =================
exports.myServices = async (req, res) => {
  try {
    const services = await Service.find({
      postedBy: req.user._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(services);
  } catch (err) {
    console.error("❌ Error fetching user services:", err);
    res.status(500).json({
      error: "Failed to fetch your services",
    });
  }
};


// ================= DELETE SERVICE =================
exports.deleteService = async (req, res) => {
  try {
    console.log("🔥 DELETE SERVICE HIT:", req.params.id);
    console.log("👤 USER:", req.user._id);

    const service = await Service.findById(req.params.id);

    // ❌ Not found
    if (!service) {
      return res.status(404).json({
        error: "Service not found ❌",
      });
    }

    // 🔒 Owner-only check
    if (service.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: "Not authorized to delete this service ❌",
      });
    }

    await service.deleteOne();

    res.status(200).json({
      message: "✅ Service deleted successfully",
    });
  } catch (err) {
    console.error("❌ Error deleting service:", err);
    res.status(500).json({
      error: "Server error while deleting service",
    });
  }
};
// ================= GET SERVICES BY CITY =================
exports.getServicesByCity = async (req, res) => {
  try {
    const city = req.params.city;

    const services = await Service.find({
      $or: [
        { location: new RegExp(city, "i") },
        { district: new RegExp(city, "i") },
      ],
    }).populate("postedBy", "username email");

    res.json(services);
  } catch (err) {
    console.error("Service Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch services" });
  }
};
// ================= SERVICES NEAR ME =================
exports.getServicesNearMe = async (req, res) => {
  try {
    const services = await Service.find({
      district: req.user.district,
    });

    res.json(services);
  } catch (err) {
    console.error("Services Near Me Error:", err);
    res.status(500).json({ error: "Failed to fetch services" });
  }
};