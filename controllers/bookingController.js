const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Hotel = require("../models/Hotel");
const Event = require("../models/Event");

// ── Helper: calculate nights between two dates ────────────────────────────────
const nightsBetween = (checkIn, checkOut) => {
  const diff = new Date(checkOut) - new Date(checkIn);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/bookings  — customer creates a booking
// ─────────────────────────────────────────────────────────────────────────────
const createBooking = async (req, res) => {
  const customerId = req.user.id;
  try {
    const {
      bookingCategory,
      hotelId,
      eventId,
      checkIn,
      checkOut,
      rooms,
      eventBookingType,
      halls,
      tickets,
      eventDate,
      guestName,
      guestEmail,
      guestPhone,
      specialRequests,
    } = req.body;

    if (!bookingCategory || !["hotel", "event"].includes(bookingCategory)) {
      return res.status(400).json({ success: false, message: "Invalid booking category" });
    }

    let vendorId, pricePerUnit, units, totalAmount;

    if (bookingCategory === "hotel") {
      if (!hotelId || !checkIn || !checkOut || !rooms) {
        return res.status(400).json({ success: false, message: "hotelId, checkIn, checkOut and rooms are required for hotel booking" });
      }
      if (!mongoose.Types.ObjectId.isValid(hotelId)) {
        return res.status(400).json({ success: false, message: "Invalid hotel ID" });
      }
      const hotel = await Hotel.findById(hotelId);
      if (!hotel || !hotel.isActive) {
        return res.status(404).json({ success: false, message: "Hotel not found or inactive" });
      }
      const nights = nightsBetween(checkIn, checkOut);
      if (nights <= 0) {
        return res.status(400).json({ success: false, message: "Check-out must be after check-in" });
      }
      if (rooms > hotel.availableRooms) {
        return res.status(400).json({ success: false, message: `Only ${hotel.availableRooms} rooms available` });
      }
      vendorId = hotel.vendorId;
      pricePerUnit = hotel.pricePerNight;
      units = nights;
      totalAmount = pricePerUnit * Number(rooms) * nights;

      // Reserve rooms
      hotel.availableRooms -= Number(rooms);
      await hotel.save();

    } else {
      // event booking
      if (!eventId || !eventBookingType) {
        return res.status(400).json({ success: false, message: "eventId and eventBookingType are required" });
      }
      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        return res.status(400).json({ success: false, message: "Invalid event ID" });
      }
      const event = await Event.findById(eventId);
      if (!event || !event.isActive) {
        return res.status(404).json({ success: false, message: "Event not found or inactive" });
      }
      vendorId = event.vendorId;

      if (eventBookingType === "hall") {
        if (!halls || halls < 1) {
          return res.status(400).json({ success: false, message: "halls count required" });
        }
        if (halls > event.hallDetails.availableHalls) {
          return res.status(400).json({ success: false, message: `Only ${event.hallDetails.availableHalls} halls available` });
        }
        pricePerUnit = event.hallDetails.pricePerDay;
        units = Number(halls);
        totalAmount = pricePerUnit * units;
        event.hallDetails.availableHalls -= units;
      } else {
        if (!tickets || tickets < 1) {
          return res.status(400).json({ success: false, message: "tickets count required" });
        }
        if (tickets > event.ticketDetails.availableSeats) {
          return res.status(400).json({ success: false, message: `Only ${event.ticketDetails.availableSeats} seats available` });
        }
        pricePerUnit = event.ticketDetails.price;
        units = Number(tickets);
        totalAmount = pricePerUnit * units;
        event.ticketDetails.availableSeats -= units;
      }
      await event.save();
    }

    const booking = await Booking.create({
      customerId,
      vendorId,
      bookingCategory,
      hotelId: bookingCategory === "hotel" ? hotelId : null,
      eventId: bookingCategory === "event" ? eventId : null,
      checkIn: bookingCategory === "hotel" ? checkIn : null,
      checkOut: bookingCategory === "hotel" ? checkOut : null,
      rooms: bookingCategory === "hotel" ? rooms : null,
      eventBookingType: bookingCategory === "event" ? eventBookingType : null,
      halls: bookingCategory === "event" && eventBookingType === "hall" ? halls : null,
      tickets: bookingCategory === "event" && eventBookingType === "ticket" ? tickets : null,
      eventDate: bookingCategory === "event" ? (eventDate || null) : null,
      pricePerUnit,
      units,
      totalAmount,
      guestName,
      guestEmail,
      guestPhone,
      specialRequests: specialRequests || null,
      status: "confirmed",
      paymentStatus: "pending",
    });

    return res.status(201).json({ success: true, booking });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal error", err: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bookings/my-bookings  — customer sees their bookings
// ─────────────────────────────────────────────────────────────────────────────
const getMyBookings = async (req, res) => {
  const customerId = req.user.id;
  const { status, page = 1, limit = 10 } = req.query;
  try {
    const filter = { customerId };
    if (status) filter.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("hotelId", "name photos location pricePerNight")
        .populate("eventId", "name photos location bookingType startDate endDate"),
      Booking.countDocuments(filter),
    ]);
    return res.status(200).json({
      success: true,
      bookings,
      totalBookings: total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal error", err: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bookings/:id  — get single booking (customer or vendor)
// ─────────────────────────────────────────────────────────────────────────────
const getBookingById = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }
    const booking = await Booking.findById(id)
      .populate("hotelId", "name photos location pricePerNight")
      .populate("eventId", "name photos location bookingType startDate endDate hallDetails ticketDetails")
      .populate("customerId", "name email")
      .populate("vendorId", "name email");

    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    const isOwner = booking.customerId._id.toString() === userId || booking.vendorId._id.toString() === userId;
    if (!isOwner) return res.status(403).json({ success: false, message: "Unauthorized" });

    return res.status(200).json({ success: true, booking });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal error", err: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/bookings/:id/cancel  — customer cancels
// ─────────────────────────────────────────────────────────────────────────────
const cancelBooking = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { cancelReason } = req.body;
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (booking.customerId.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    if (booking.status === "cancelled") {
      return res.status(400).json({ success: false, message: "Already cancelled" });
    }
    if (booking.status === "completed") {
      return res.status(400).json({ success: false, message: "Completed bookings cannot be cancelled" });
    }

    // Restore availability
    if (booking.bookingCategory === "hotel" && booking.hotelId) {
      await Hotel.findByIdAndUpdate(booking.hotelId, {
        $inc: { availableRooms: booking.rooms || 0 },
      });
    } else if (booking.bookingCategory === "event" && booking.eventId) {
      const event = await Event.findById(booking.eventId);
      if (event) {
        if (booking.eventBookingType === "hall") {
          event.hallDetails.availableHalls += booking.halls || 0;
        } else {
          event.ticketDetails.availableSeats += booking.tickets || 0;
        }
        await event.save();
      }
    }

    booking.status = "cancelled";
    booking.paymentStatus = booking.paymentStatus === "paid" ? "refunded" : "cancelled";
    booking.cancelledAt = new Date();
    booking.cancelReason = cancelReason || null;
    await booking.save();

    return res.status(200).json({ success: true, message: "Booking cancelled successfully", booking });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal error", err: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bookings/vendor/all  — vendor sees all bookings for their listings
// ─────────────────────────────────────────────────────────────────────────────
const getVendorBookings = async (req, res) => {
  const vendorId = req.user.id;
  const { status, category, page = 1, limit = 10 } = req.query;
  try {
    const filter = { vendorId };
    if (status) filter.status = status;
    if (category) filter.bookingCategory = category;
    const skip = (Number(page) - 1) * Number(limit);
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("customerId", "name email avatar")
        .populate("hotelId", "name photos")
        .populate("eventId", "name photos bookingType"),
      Booking.countDocuments(filter),
    ]);
    return res.status(200).json({
      success: true,
      bookings,
      totalBookings: total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal error", err: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/bookings/vendor/:id/status  — vendor updates booking status
// ─────────────────────────────────────────────────────────────────────────────
const updateBookingStatus = async (req, res) => {
  const vendorId = req.user.id;
  const { id } = req.params;
  const { status } = req.body;
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }
    const allowed = ["confirmed", "completed", "cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${allowed.join(", ")}` });
    }
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (booking.vendorId.toString() !== vendorId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    booking.status = status;
    if (status === "completed") booking.paymentStatus = "paid";
    await booking.save();
    return res.status(200).json({ success: true, booking });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal error", err: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bookings/vendor/stats  — vendor dashboard numbers
// ─────────────────────────────────────────────────────────────────────────────
const getVendorStats = async (req, res) => {
  const vendorId = req.user.id;
  try {
    const [
      totalHotels,
      activeHotels,
      totalEvents,
      activeEvents,
      totalBookings,
      confirmedBookings,
      pendingBookings,
      completedBookings,
      cancelledBookings,
      revenue,
    ] = await Promise.all([
      Hotel.countDocuments({ vendorId }),
      Hotel.countDocuments({ vendorId, isActive: true }),
      Event.countDocuments({ vendorId }),
      Event.countDocuments({ vendorId, isActive: true }),
      Booking.countDocuments({ vendorId }),
      Booking.countDocuments({ vendorId, status: "confirmed" }),
      Booking.countDocuments({ vendorId, status: "pending" }),
      Booking.countDocuments({ vendorId, status: "completed" }),
      Booking.countDocuments({ vendorId, status: "cancelled" }),
      Booking.aggregate([
        { $match: { vendorId: new mongoose.Types.ObjectId(vendorId), status: { $in: ["confirmed", "completed"] } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        hotels: { total: totalHotels, active: activeHotels },
        events: { total: totalEvents, active: activeEvents },
        bookings: {
          total: totalBookings,
          confirmed: confirmedBookings,
          pending: pendingBookings,
          completed: completedBookings,
          cancelled: cancelledBookings,
        },
        revenue: revenue[0]?.total || 0,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal error", err: err.message });
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getVendorBookings,
  updateBookingStatus,
  getVendorStats,
};
