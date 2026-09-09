const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { createReview, getReviews, deleteReview } = require("../controllers/reviewController");

router.get("/", getReviews);
router.post("/", authMiddleware, roleMiddleware("customer"), createReview);
router.delete("/:id", authMiddleware, roleMiddleware("customer"), deleteReview);

module.exports = router;
