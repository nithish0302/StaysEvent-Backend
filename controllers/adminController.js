const User = require("../models/User");
const Hotel = require("../models/Hotel");
const Event = require("../models/Event");
const Booking = require("../models/Booking");

// GET /api/admin/vendors?status=pending|approved|rejected&page=1&limit=10
// Each vendor includes hotelCount and eventCount
const getVendors = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const match = { role: "vendor" };
    if (status) match.vendorStatus = status;
    const skip = (Number(page) - 1) * Number(limit);

    const [result] = await User.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          vendors: [
            { $skip: skip },
            { $limit: Number(limit) },
            { $project: { password: 0, refreshToken: 0 } },
            {
              $lookup: {
                from: "hotels",
                localField: "_id",
                foreignField: "vendorId",
                as: "hotels",
              },
            },
            {
              $lookup: {
                from: "events",
                localField: "_id",
                foreignField: "vendorId",
                as: "events",
              },
            },
            {
              $addFields: {
                hotelCount: { $size: "$hotels" },
                eventCount: { $size: "$events" },
              },
            },
            { $project: { hotels: 0, events: 0 } },
          ],
          total: [{ $count: "count" }],
        },
      },
    ]);

    const vendors = result?.vendors || [];
    const total = result?.total?.[0]?.count || 0;

    return res.status(200).json({
      success: true,
      vendors,
      total,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal Error Occurred", err });
  }
};

// PATCH /api/admin/vendors/:id/status  { status: "approved"|"rejected" }
const updateVendorStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ["approved", "rejected", "pending", "suspended"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: "Status must be approved, rejected, pending or suspended" });
  }
  // Once a vendor is approved, they can only be suspended (not sent back to
  // pending/rejected); a suspended vendor can only be re-approved.
  const ALLOWED_TRANSITIONS = {
    pending: ["approved", "rejected"],
    approved: ["suspended"],
    suspended: ["approved"],
    rejected: ["approved"],
  };
  try {
    const existing = await User.findOne({ _id: id, role: "vendor" }).select("vendorStatus");
    if (!existing) return res.status(404).json({ success: false, message: "Vendor not found" });

    const currentStatus = existing.vendorStatus || "pending";
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${currentStatus} to ${status}`,
      });
    }

    const vendor = await User.findOneAndUpdate(
      { _id: id, role: "vendor" },
      { vendorStatus: status },
      { new: true }
    ).select("-password -refreshToken");
    return res.status(200).json({ success: true, vendor, message: `Vendor ${status} successfully` });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal Error Occurred", err });
  }
};

// GET /api/admin/users?page=1&limit=10
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role } = req.query;
    const filter = {};
    if (role) filter.role = role;
    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(filter).select("-password -refreshToken").skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);
    return res.status(200).json({ success: true, users, total, totalPages: Math.ceil(total / limit), currentPage: Number(page) });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal Error Occurred", err });
  }
};

// GET /api/admin/stats
const getAdminStats = async (req, res) => {
  try {
    const [totalUsers, totalVendors, pendingVendors, totalHotels, totalEvents, totalBookings, revenueAgg] = await Promise.all([
      User.countDocuments({ role: "customer" }),
      User.countDocuments({ role: "vendor" }),
      User.countDocuments({ role: "vendor", vendorStatus: "pending" }),
      Hotel.countDocuments(),
      Event.countDocuments(),
      Booking.countDocuments(),
      Booking.aggregate([
        { $match: { status: { $in: ["confirmed", "completed"] } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
    ]);
    return res.status(200).json({
      success: true,
      stats: {
        customers: totalUsers,
        vendors: totalVendors,
        pendingVendors,
        hotels: totalHotels,
        events: totalEvents,
        bookings: totalBookings,
        revenue: revenueAgg[0]?.total || 0,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal Error Occurred", err });
  }
};

// PATCH /api/admin/listings/:itemType/:id/feature  { itemType: "hotel"|"event" }
const toggleFeatured = async (req, res) => {
  const { itemType, id } = req.params;
  const Model = itemType === "hotel" ? Hotel : itemType === "event" ? Event : null;
  if (!Model) {
    return res.status(400).json({ success: false, message: "itemType must be hotel or event" });
  }
  try {
    const item = await Model.findById(id);
    if (!item) return res.status(404).json({ success: false, message: "Listing not found" });
    item.isFeatured = !item.isFeatured;
    await item.save();
    return res.status(200).json({ success: true, isFeatured: item.isFeatured, item });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal Error Occurred", err: err.message });
  }
};

// GET /api/admin/bookings?status=&category=&page=1&limit=10
const getAllBookings = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.bookingCategory = category;
    const skip = (Number(page) - 1) * Number(limit);
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("customerId", "name email")
        .populate("vendorId", "name email vendorDetails.businessName")
        .populate("hotelId", "name")
        .populate("eventId", "name"),
      Booking.countDocuments(filter),
    ]);
    return res.status(200).json({
      success: true,
      bookings,
      total,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal Error Occurred", err: err.message });
  }
};

module.exports = {
  getVendors,
  updateVendorStatus,
  getAllUsers,
  getAdminStats,
  toggleFeatured,
  getAllBookings,
};
