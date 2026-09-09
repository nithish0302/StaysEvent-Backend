const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getWishlist, addToWishlist, removeFromWishlist } = require("../controllers/userController");

router.get("/wishlist", authMiddleware, getWishlist);
router.post("/wishlist", authMiddleware, addToWishlist);
router.delete("/wishlist", authMiddleware, removeFromWishlist);

module.exports = router;
