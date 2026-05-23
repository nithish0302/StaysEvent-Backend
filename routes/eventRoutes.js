const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  changeEventStatus,
  getMyEvents,
} = require("../controllers/eventController");

//POST METHOD
router.post("/", authMiddleware, roleMiddleware("vendor"), createEvent);

//GET METHODS
router.get("/", getAllEvents);
router.get(
  "/vendor/my-events",
  authMiddleware,
  roleMiddleware("vendor"),
  getMyEvents,
);
router.get("/:id", getEventById);

//PUT METHODS
router.put("/:id", authMiddleware, roleMiddleware("vendor"), updateEvent);

//DELETE METHODS
router.delete("/:id", authMiddleware, roleMiddleware("vendor"), deleteEvent);

//PATCH METHODS
router.patch(
  "/:id/status",
  authMiddleware,
  roleMiddleware("vendor"),
  changeEventStatus,
);

module.exports = router;
