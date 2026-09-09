const User = require("../models/User");
const Hotel = require("../models/Hotel");
const Event = require("../models/Event");

// GET /api/users/wishlist
const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("wishlist");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Manual population because itemType stores "HOTEL"/"EVENT"
    // but mongoose model names are "Hotel"/"Event"
    const populated = await Promise.all(
      user.wishlist.map(async (w) => {
        let itemData = null;
        try {
          if (w.itemType === "HOTEL") {
            itemData = await Hotel.findById(w.itemId).select("name photos location pricePerNight starRating availableRooms isFeatured");
          } else if (w.itemType === "EVENT") {
            itemData = await Event.findById(w.itemId).select("name photos location bookingType hallDetails ticketDetails startDate");
          }
        } catch (_) { /* item may have been deleted */ }
        return { itemId: itemData, itemType: w.itemType };
      })
    );

    return res.status(200).json({ success: true, wishlist: populated });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal Error Occurred", err });
  }
};

// POST /api/users/wishlist  { itemId, itemType: "HOTEL"|"EVENT" }
const addToWishlist = async (req, res) => {
  const { itemId, itemType } = req.body;
  if (!itemId || !itemType) {
    return res.status(400).json({ success: false, message: "itemId and itemType are required" });
  }
  if (!["HOTEL", "EVENT"].includes(itemType)) {
    return res.status(400).json({ success: false, message: "itemType must be HOTEL or EVENT" });
  }
  try {
    const user = await User.findById(req.user.id);
    const alreadyExists = user.wishlist.some(
      (w) => w.itemId.toString() === itemId && w.itemType === itemType
    );
    if (alreadyExists) {
      return res.status(400).json({ success: false, message: "Item already in wishlist" });
    }
    user.wishlist.push({ itemId, itemType });
    await user.save();
    return res.status(200).json({ success: true, message: "Added to wishlist" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal Error Occurred", err });
  }
};

// DELETE /api/users/wishlist  { itemId, itemType }
const removeFromWishlist = async (req, res) => {
  const { itemId, itemType } = req.body;
  if (!itemId || !itemType) {
    return res.status(400).json({ success: false, message: "itemId and itemType are required" });
  }
  try {
    const user = await User.findById(req.user.id);
    const before = user.wishlist.length;
    user.wishlist = user.wishlist.filter(
      (w) => !(w.itemId.toString() === itemId && w.itemType === itemType)
    );
    if (user.wishlist.length === before) {
      return res.status(404).json({ success: false, message: "Item not found in wishlist" });
    }
    await user.save();
    return res.status(200).json({ success: true, message: "Removed from wishlist" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal Error Occurred", err });
  }
};

module.exports = { getWishlist, addToWishlist, removeFromWishlist };
