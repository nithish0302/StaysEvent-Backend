const Review = require("../models/Review");
const Booking = require("../models/Booking");
const Hotel = require("../models/Hotel");
const Event = require("../models/Event");
const mongoose = require("mongoose");

const itemModelFor = (itemType) => (itemType === "HOTEL" ? Hotel : Event);

// Recompute avgRating/reviewCount for an item and persist onto the
// Hotel/Event document so listing cards and detail-page headers stay in
// sync with the live review data (rather than only ReviewSection knowing it).
const syncItemRatingStats = async (itemId, itemType) => {
  const agg = await Review.aggregate([
    { $match: { itemId: new mongoose.Types.ObjectId(itemId), itemType } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const avgRating = agg[0]?.avg ? Number(agg[0].avg.toFixed(1)) : 0;
  const reviewCount = agg[0]?.count || 0;

  const Model = itemType === "HOTEL" ? Hotel : Event;
  await Model.findByIdAndUpdate(itemId, { avgRating, reviewCount });
};

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
    await syncItemRatingStats(itemId, itemType);
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

// DELETE /api/reviews/:id — customer deletes own review, OR admin moderates any review
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });
    const isOwner = review.customerId.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    const { itemId, itemType } = review;
    await review.deleteOne();
    await syncItemRatingStats(itemId, itemType);
    return res.status(200).json({ success: true, message: "Review deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal Error Occurred", err });
  }
};

// PATCH /api/reviews/:id/reply — vendor replies to a review on their own listing
const replyToReview = async (req, res) => {
  const vendorId = req.user.id;
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, message: "Reply text is required" });
  }
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });

    const Model = itemModelFor(review.itemType);
    const item = await Model.findById(review.itemId).select("vendorId");
    if (!item || item.vendorId.toString() !== vendorId) {
      return res.status(403).json({ success: false, message: "You can only reply to reviews on your own listings" });
    }

    review.vendorReply = { text: text.trim(), repliedAt: new Date() };
    await review.save();
    await review.populate("customerId", "name avatar");

    return res.status(200).json({ success: true, review });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal Error Occurred", err });
  }
};

// DELETE /api/reviews/:id/reply — vendor removes their own reply
const deleteReply = async (req, res) => {
  const vendorId = req.user.id;
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });

    const Model = itemModelFor(review.itemType);
    const item = await Model.findById(review.itemId).select("vendorId");
    if (!item || item.vendorId.toString() !== vendorId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    review.vendorReply = { text: null, repliedAt: null };
    await review.save();
    return res.status(200).json({ success: true, review });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal Error Occurred", err });
  }
};

module.exports = { createReview, getReviews, deleteReview, replyToReview, deleteReply };
