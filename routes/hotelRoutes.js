const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
  createHotel,
  getAllHotels,
  getHotelById,
  updateHotel,
  deleteHotel,
  changeHotelStatus,
  getMyHotels,
} = require("../controllers/hotelController");

//POST METHODS
router.post("/", authMiddleware, roleMiddleware("vendor"), createHotel);

//GET METHODS
router.get("/", getAllHotels);
router.get(
  "/vendor/my-hotels",
  authMiddleware,
  roleMiddleware("vendor"),
  getMyHotels,
);
router.get("/:id", getHotelById);

//PUT METHODS
router.put("/:id", authMiddleware, roleMiddleware("vendor"), updateHotel);

//DELETE METHODS
router.delete("/:id", authMiddleware, roleMiddleware("vendor"), deleteHotel);

//PATCH METHODS
router.patch(
  "/:id/status",
  authMiddleware,
  roleMiddleware("vendor"),
  changeHotelStatus,
);

module.exports = router;
