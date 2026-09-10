const crypto = require("crypto");
const Razorpay = require("razorpay");
const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const User = require("../models/User");
const { sendBookingConfirmation } = require("../utils/mailer");

const getRazorpayInstance = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return null;
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/create-order — customer starts paying for a booking
// ─────────────────────────────────────────────────────────────────────────────
const createOrder = async (req, res) => {
  const customerId = req.user.id;
  const { bookingId } = req.body;

  if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
    return res.status(400).json({ success: false, message: "Valid bookingId is required" });
  }

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    if (booking.customerId.toString() !== customerId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    if (booking.status === "cancelled") {
      return res.status(400).json({ success: false, message: "Booking is cancelled" });
    }
    if (booking.paymentStatus === "paid") {
      return res.status(400).json({ success: false, message: "Booking is already paid" });
    }

    const razorpay = getRazorpayInstance();
    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message: "Payments are not configured on the server yet",
      });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(booking.totalAmount * 100), // paise
      currency: "INR",
      receipt: `booking_${booking._id}`,
      notes: { bookingId: booking._id.toString() },
    });

    booking.razorpayOrderId = order.id;
    await booking.save();

    return res.status(200).json({
      success: true,
      order,
      keyId: process.env.RAZORPAY_KEY_ID,
      booking: {
        id: booking._id,
        totalAmount: booking.totalAmount,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        guestPhone: booking.guestPhone,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal error", err: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/verify — verify Razorpay signature after checkout
// ─────────────────────────────────────────────────────────────────────────────
const verifyPayment = async (req, res) => {
  const customerId = req.user.id;
  const {
    bookingId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = req.body;

  if (
    !bookingId ||
    !razorpay_order_id ||
    !razorpay_payment_id ||
    !razorpay_signature
  ) {
    return res.status(400).json({ success: false, message: "Missing payment verification fields" });
  }

  try {
    const booking = await Booking.findById(bookingId)
      .populate("hotelId", "name photos")
      .populate("eventId", "name photos");
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    if (booking.customerId.toString() !== customerId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    if (booking.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({ success: false, message: "Order does not match this booking" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    booking.paymentStatus = "paid";
    booking.razorpayPaymentId = razorpay_payment_id;
    if (booking.status === "pending") booking.status = "confirmed";
    await booking.save();

    // Fire-and-forget booking confirmation email — never blocks the response,
    // and silently no-ops if MAIL_USER/MAIL_PASS aren't configured.
    try {
      const customer = await User.findById(customerId).select("name email");
      const toEmail = booking.guestEmail || customer?.email;
      const toName = booking.guestName || customer?.name || "Guest";
      if (toEmail) {
        sendBookingConfirmation(booking, toEmail, toName).catch((e) =>
          console.error("[mailer] booking confirmation failed:", e.message),
        );
      }
    } catch (e) {
      console.error("[mailer] booking confirmation lookup failed:", e.message);
    }

    return res.status(200).json({ success: true, message: "Payment verified successfully", booking });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal error", err: err.message });
  }
};

module.exports = { createOrder, verifyPayment };
