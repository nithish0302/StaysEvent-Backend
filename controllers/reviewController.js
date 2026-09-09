const Review = require("../models/Review");
const Booking = require("../models/Booking");
const mongoose = require("mongoose");

// POST /api/reviews  — customer only
const createReview = async (req, res) => {
  const customerId = req.user.id;
  const { itemId, itemType, rating, comment } = req.body;

  if (!itemId || !itemType || !rating) {
    return res.status(400).json({ success: false, message: "itemId, itemType and rating are required" });
  }
  if (!["HOTEL", "EVENT"].includes(itemType)) {
    return res.status(400).json({ success: false, message: "itemType must be HOTEL or EVENT" });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, message: "Rating must be 1–5" });
  }

  try {
    // Only allow reviews if customer has a completed booking for this item
    const category = itemType === "HOTEL" ? "hotel" : "event";
    const field = itemType === "HOTEL" ? "hotelId" : "eventId";
    const hasBooking = await Booking.findOne({
      customerId,
      [field]: itemId,
      bookingCategory: category,
      status: "completed",
    });
    if (!hasBooking) {
      return res.status(403).json({ success: false, message: "You can only review items you have stayed at or attended" });
    }

    const review = await Review.create({ customerId, itemId, itemType, rating, comment });
    await review.populate("customerId", "name avatar");
    return res.status(201).json({ success: true, review });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "You have already reviewed this item" });
    }
    return res.status(500).json({ success: false, message: "Internal Error Occurred", err });
  }
};

// GET /api/reviews?itemId=&itemType=
const getReviews = async (req, res) => {
  const { itemId, itemType, page = 1, limit = 10 } = req.query;
  if (!itemId || !itemType) {
    return res.status(400).json({ success: false, message: "itemId and itemType are required" });
  }
  try {
    const skip = (Number(page) - 1) * Number(limit);
    const [reviews, total, agg] = await Promise.all([
      Review.find({ itemId, itemType })
        .populate("customerId", "name avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Review.countDocuments({ itemId, itemType }),
      Review.aggregate([
        { $match: { itemId: new mongoose.Types.ObjectId(itemId), itemType } },
        { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
      ]),
    ]);
    const avgRating = agg[0]?.avg?.toFixed(1) || 0;
    return res.status(200).json({ success: true, reviews, total, totalPages: Math.ceil(total / limit), avgRating });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal Error Occurred", err });
  }
};

// DELETE /api/reviews/:id — customer deletes own review
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });
    if (review.customerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    await review.deleteOne();
    return res.status(200).json({ success: true, message: "Review deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal Error Occurred", err });
  }
};

module.exports = { createReview, getReviews, deleteReview };
