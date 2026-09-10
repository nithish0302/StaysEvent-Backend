const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ── What is being booked ──────────────────────────────────────────────────
    bookingCategory: {
      type: String,
      enum: ["hotel", "event"],
      required: true,
    },
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      default: null,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      default: null,
    },

    // ── Hotel booking fields ──────────────────────────────────────────────────
    checkIn: { type: Date, default: null },
    checkOut: { type: Date, default: null },
    rooms: { type: Number, default: null, min: 1 },

    // ── Event booking fields (hall or ticket) ─────────────────────────────────
    eventBookingType: {
      type: String,
      enum: ["hall", "ticket", null],
      default: null,
    },
    halls: { type: Number, default: null, min: 1 },   // for hall bookings
    tickets: { type: Number, default: null, min: 1 }, // for ticket bookings
    eventDate: { type: Date, default: null },          // which day (hall) or event start

    // ── Pricing ───────────────────────────────────────────────────────────────
    pricePerUnit: { type: Number, required: true, min: 0 },
    units: { type: Number, required: true, min: 1 },  // nights / halls / tickets
    totalAmount: { type: Number, required: true, min: 0 },

    // ── Guest info ────────────────────────────────────────────────────────────
    guestName: { type: String, required: true, trim: true },
    guestEmail: { type: String, required: true, trim: true },
    guestPhone: { type: String, required: true, trim: true },
    specialRequests: { type: String, default: null, maxlength: 500 },

    // ── Status ────────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded"],
      default: "pending",
    },

    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: null },

    // Has the vendor seen this booking yet? Drives the "new booking" badge.
    vendorSeen: { type: Boolean, default: false },
    // Has the customer been shown the "stay complete — leave a review"
    // prompt for this booking yet? Reset to false whenever a vendor marks
    // the booking completed.
    customerNotified: { type: Boolean, default: false },

    // ── Razorpay payment tracking ─────────────────────────────────────────────
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
  },
  { timestamps: true }
);

// Indexes for common queries
BookingSchema.index({ customerId: 1, createdAt: -1 });
BookingSchema.index({ vendorId: 1, createdAt: -1 });
BookingSchema.index({ hotelId: 1 });
BookingSchema.index({ eventId: 1 });

module.exports = mongoose.model("Booking", BookingSchema);
