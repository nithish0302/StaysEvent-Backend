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
  getVendorNewBookingsCount,
  markVendorBookingsSeen,
  getPendingReviewBookings,
  dismissReviewPrompt,
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
router.get(
  "/customer/pending-review",
  authMiddleware,
  roleMiddleware("customer"),
  getPendingReviewBookings
);
router.patch(
  "/:id/cancel",
  authMiddleware,
  roleMiddleware("customer"),
  cancelBooking
);
router.patch(
  "/:id/dismiss-review-prompt",
  authMiddleware,
  roleMiddleware("customer"),
  dismissReviewPrompt
);

// ── Vendor routes ──────────────────────────────────────────────────────────
router.get(
  "/vendor/stats",
  authMiddleware,
  roleMiddleware("vendor"),
  getVendorStats
);
router.get(
  "/vendor/new-count",
  authMiddleware,
  roleMiddleware("vendor"),
  getVendorNewBookingsCount
);
router.patch(
  "/vendor/mark-seen",
  authMiddleware,
  roleMiddleware("vendor"),
  markVendorBookingsSeen
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
