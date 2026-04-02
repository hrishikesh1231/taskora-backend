const express = require("express");
const router = express.Router();
const gigController = require("../controllers/gigController");
const { isLoggedIn } = require("../middlewares/middleware");

router.post("/addGig", isLoggedIn, gigController.addGig);

router.get("/gig/:id", isLoggedIn, gigController.getGig);
router.put("/gig/:id", isLoggedIn, gigController.updateGig);
router.delete("/gig/:id", isLoggedIn, gigController.deleteGig);

router.get("/getGigs/:city", gigController.getGigsByCity);
router.get("/gigs-near-me", isLoggedIn, gigController.getNearMe);

router.get("/count/gigs/:city", gigController.countByCity);
router.get("/my-gigs", isLoggedIn, gigController.myGigs);
router.get(
  "/my-applications",
  isLoggedIn,
  gigController.myApplications
);

router.get("/getGigsByCategory/:category", gigController.getByCategory);
// uper ka route home page popular categorit


module.exports = router;