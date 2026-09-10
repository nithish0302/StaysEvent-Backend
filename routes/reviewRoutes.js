const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { createReview, getReviews, deleteReview, replyToReview, deleteReply } = require("../controllers/reviewController");

router.get("/", getReviews);
router.post("/", authMiddleware, roleMiddleware("customer"), createReview);
router.delete("/:id", authMiddleware, roleMiddleware("customer", "admin"), deleteReview);
router.patch("/:id/reply", authMiddleware, roleMiddleware("vendor"), replyToReview);
router.delete("/:id/reply", authMiddleware, roleMiddleware("vendor"), deleteReply);

module.exports = router;
