const express = require("express");
const router = express.Router();

const serviceController = require("../controllers/serviceController");
const { isLoggedIn } = require("../middlewares/middleware");

// ================= CREATE =================
router.post("/addService", isLoggedIn, serviceController.addService);

// ================= GET SINGLE (Owner Edit Load) =================
router.get("/service/:id", isLoggedIn, serviceController.getService);

// ================= UPDATE =================
router.put("/service/:id", isLoggedIn, serviceController.updateService);

// ================= DELETE =================
router.delete("/service/:id", isLoggedIn, serviceController.deleteService);

// ================= GET BY CITY =================
router.get("/getService/:city", serviceController.getServicesByCity);

// ================= SERVICES NEAR ME =================
router.get("/services-near-me", isLoggedIn, serviceController.getServicesNearMe);

// ================= MY SERVICES =================
router.get("/my-services", isLoggedIn, serviceController.myServices);

// ================= MY SERVICE APPLICATION HISTORY =================
router.get(
  "/my-service-applications",
  isLoggedIn,
  serviceController.myServiceApplications
);

// ================= COUNT BY DISTRICT =================
router.get(
  "/count/services/:district",
  serviceController.countServicesByDistrict
);

module.exports = router;