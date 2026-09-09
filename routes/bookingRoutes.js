const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getVendorBookings,
  updateBookingStatus,
  getVendorStats,
} = require("../controllers/bookingController");

// ── Customer routes ────────────────────────────────────────────────────────
router.post(
  "/",
  authMiddleware,
  roleMiddleware("customer"),
  createBooking
);
router.get(
  "/my-bookings",
  authMiddleware,
  roleMiddleware("customer"),
  getMyBookings
);
router.patch(
  "/:id/cancel",
  authMiddleware,
  roleMiddleware("customer"),
  cancelBooking
);

// ── Vendor routes ──────────────────────────────────────────────────────────
router.get(
  "/vendor/stats",
  authMiddleware,
  roleMiddleware("vendor"),
  getVendorStats
);
router.get(
  "/vendor/all",
  authMiddleware,
  roleMiddleware("vendor"),
  getVendorBookings
);
router.patch(
  "/vendor/:id/status",
  authMiddleware,
  roleMiddleware("vendor"),
  updateBookingStatus
);

// ── Shared (customer + vendor) ─────────────────────────────────────────────
router.get("/:id", authMiddleware, getBookingById);

module.exports = router;
