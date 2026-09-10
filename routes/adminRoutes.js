const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
  getVendors,
  updateVendorStatus,
  getAllUsers,
  getAdminStats,
  toggleFeatured,
  getAllBookings,
} = require("../controllers/adminController");

router.use(authMiddleware, roleMiddleware("admin"));

router.get("/stats", getAdminStats);
router.get("/vendors", getVendors);
router.patch("/vendors/:id/status", updateVendorStatus);
router.get("/users", getAllUsers);
router.patch("/listings/:itemType/:id/feature", toggleFeatured);
router.get("/bookings", getAllBookings);

module.exports = router;
